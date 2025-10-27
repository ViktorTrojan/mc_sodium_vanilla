import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import type { MissingModEntry, ModCategory, ModDefinition, ModDefinitionSimple } from "./types"

interface ModrinthProject {
  title: string
  project_type: string
}

interface ModInfo {
  title: string
  project_type: string
  identifier: string
  category: ModCategory
}

export async function get_mod_list_markdown(mod_list: ModDefinition[], failed_to_install?: string[], mod_installation_details?: Map<string, ModDefinitionSimple | null>): Promise<string> {
  const failed_set = new Set(failed_to_install || [])

  const mod_info_promises = mod_list.map(async (mod) => {
    try {
      const response = await fetch(`https://api.modrinth.com/v2/project/${mod.identifier}`)
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
      const installation_detail = mod_installation_details?.get(mod.identifier)
      const alternative_installed = installation_detail !== undefined && installation_detail !== null && installation_detail.identifier !== mod.identifier

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
      if (mod_installation_details && (failed_set.has(mod.identifier) || alternative_installed)) {
        if (original_mod?.alternatives && original_mod.alternatives.length > 0) {
          markdown += "  - **Alternatives:**\n"

          for (const alt of original_mod.alternatives) {
            // Fetch alternative mod info
            try {
              const alt_response = await fetch(`https://api.modrinth.com/v2/project/${alt.identifier}`)
              if (alt_response.ok) {
                const alt_data = (await alt_response.json()) as ModrinthProject
                const alt_url = `https://modrinth.com/${alt_data.project_type}/${alt.identifier}`

                // Check if this alternative was successfully installed
                const is_installed = installation_detail && installation_detail.identifier === alt.identifier
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

export function save_missing_mod_list_json(mod_list: ModDefinition[], mod_installation_details: Map<string, ModDefinitionSimple | null>): void {
  const missing_mods: MissingModEntry[] = []

  for (const mod of mod_list) {
    const installation_detail = mod_installation_details.get(mod.identifier)

    // Only include mods that had installation issues (either failed or used alternative)
    if (installation_detail !== undefined) {
      missing_mods.push({
        identifier: mod.identifier,
        category: mod.category,
        alternatives: mod.alternatives,
        installedAlternative: installation_detail || undefined
      })
    }
  }

  const root_dir = resolve(__dirname, "../..")
  const output_path = resolve(root_dir, "missing_mod_list.json")

  writeFileSync(output_path, JSON.stringify(missing_mods, null, 2), "utf-8")
  console.log(`✅ Saved missing mod list to ${output_path}`)
}
