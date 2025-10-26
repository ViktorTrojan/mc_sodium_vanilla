import type { ModDefinition, ModCategory } from "./types"

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

export async function get_mod_list_markdown(
  mod_list: ModDefinition[],
  failed_to_install?: string[]
): Promise<string> {
  const failed_set = new Set(failed_to_install || [])

  const mod_info_promises = mod_list.map(async (mod) => {
    try {
      const response = await fetch(`https://api.modrinth.com/v2/project/${mod.identifier}`)
      if (!response.ok) {
        console.error(`Failed to fetch mod ${mod.identifier}: ${response.statusText}`)
        return null
      }
      const data = await response.json() as ModrinthProject
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
    mods_by_category[mod_info.category]!.push(mod_info)
  }

  // markdown list
  let markdown = ''

  for (const [category, mods] of Object.entries(mods_by_category)) {
    markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`
    for (const mod of mods) {
      const url = `https://modrinth.com/${mod.project_type}/${mod.identifier}`
      const checkbox = failed_set.has(mod.identifier) ? '[ ]' : '[x]'
      markdown += `- ${checkbox} [${mod.title}](${url})\n`
    }
    markdown += '\n'
  }

  return markdown
}
