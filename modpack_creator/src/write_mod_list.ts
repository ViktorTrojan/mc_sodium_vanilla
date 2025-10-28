import { resolve } from "node:path"
import type { ModCategory, ModDefinitionWithAlternatives, ModInstallationState } from "./types"

interface ModrinthProject {
  title: string
  project_type: string
}

async function fetch_with_retry(url: string, max_retries = 5, initial_delay_ms = 1000): Promise<Response> {
  let last_error: Error | null = null

  for (let attempt = 0; attempt <= max_retries; attempt++) {
    try {
      const response = await fetch(url)

      // If we get a 429 (Too Many Requests), retry with exponential backoff
      if (response.status === 429) {
        if (attempt < max_retries) {
          const delay = initial_delay_ms * 2 ** attempt
          console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${max_retries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      return response
    } catch (error) {
      last_error = error as Error
      if (attempt < max_retries) {
        const delay = initial_delay_ms * 2 ** attempt
        console.log(`Fetch error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${max_retries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw last_error || new Error("Max retries exceeded")
}

interface ModInfo {
  title: string
  project_type: string
  identifier: string
  category: ModCategory
}

export async function get_mod_list_markdown(mod_list: ModDefinitionWithAlternatives[], installation_state?: ModInstallationState): Promise<string> {
  const failed_set = new Set(installation_state?.failed.map((m) => m.identifier) || [])
  const alternative_installed_set = new Set(installation_state?.alternative_installed.map((m) => m.identifier) || [])

  const mod_info_promises = mod_list.map(async (mod) => {
    try {
      const response = await fetch_with_retry(`https://api.modrinth.com/v2/project/${mod.identifier}`, 20, 5000)
      if (!response.ok) {
        console.error(`Failed to fetch mod ${mod.identifier}: ${response.statusText}`)
        return null
      }
      const data = (await response.json()) as ModrinthProject
      return {
        title: data.title,
        project_type: data.project_type,
        identifier: mod.identifier,
        category: mod.category
      }
    } catch (error) {
      console.error(`Error fetching mod ${mod.identifier}:`, error)
      return null
    }
  })

  const mod_infos = await Promise.all(mod_info_promises)
  const valid_mod_infos: ModInfo[] = mod_infos.filter((info): info is ModInfo => info !== null)

  // Group mods by category
  const mods_by_category: Record<string, ModInfo[]> = {}
  for (const mod_info of valid_mod_infos) {
    if (!mods_by_category[mod_info.category]) {
      mods_by_category[mod_info.category] = []
    }
    mods_by_category[mod_info.category]?.push(mod_info)
  }

  // markdown list
  let markdown = ""

  for (const [category, mods] of Object.entries(mods_by_category)) {
    markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`
    for (const mod of mods) {
      const url = `https://modrinth.com/${mod.project_type}/${mod.identifier}`

      // Check if an alternative was installed instead
      const alternative_installed = alternative_installed_set.has(mod.identifier)

      // Determine the marker for the main mod
      let marker: string
      if (alternative_installed) {
        marker = "[ ]" // nothing for main package if alternative was installed
      } else if (failed_set.has(mod.identifier)) {
        marker = "[ ]" // failed and no alternatives
      } else {
        marker = "[x]" // checkbox if main package was successfully installed
      }

      markdown += `- ${marker} [${mod.title}](${url})\n`

      // Find the original mod definition to get alternatives
      const original_mod = mod_list.find((m) => m.identifier === mod.identifier)

      // Show alternatives if the main mod failed or if an alternative was installed
      if (installation_state && (failed_set.has(mod.identifier) || alternative_installed)) {
        if (original_mod?.alternatives && original_mod.alternatives.length > 0) {
          markdown += "  - **Alternatives:**\n"

          for (const alt of original_mod.alternatives) {
            // Fetch alternative mod info
            try {
              const alt_response = await fetch_with_retry(`https://api.modrinth.com/v2/project/${alt.identifier}`, 20, 5000)
              if (alt_response.ok) {
                const alt_data = (await alt_response.json()) as ModrinthProject
                const alt_url = `https://modrinth.com/${alt_data.project_type}/${alt.identifier}`

                // Check if this alternative was successfully installed by checking if parent mod is in alternativeInstalled
                const is_installed = alternative_installed
                const alt_marker = is_installed ? "[x]" : "[ ]" // no symbol for alternatives

                markdown += `    - ${alt_marker} [${alt_data.title}](${alt_url})\n`
              }
            } catch (error) {
              console.error(`Error fetching alternative mod ${alt.identifier}:`, error)
            }
          }
        }
      }
    }
    markdown += "\n"
  }

  return markdown
}

export async function save_installation_state(installation_state: ModInstallationState): Promise<void> {
  const state = installation_state

  const root_dir = resolve(__dirname, "../..")
  const output_path = resolve(root_dir, "mod_installation_state.json")

  try {
    await Bun.write(output_path, JSON.stringify(state, null, 2))
    console.log(`✅ Saved mod installation state to ${output_path}`)
  } catch (error) {
    console.error(`❌ Failed to write mod installation state: ${error}`)
    // Don't crash the build process if we can't write the file
  }
}
