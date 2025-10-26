import type { ResourcePackDefinition } from "./types"


const resource_pack_list_raw: ResourcePackDefinition[] = [
  {
    identifier: "fancy-crops",
    method: "modrinth",
  },
  {
    identifier: "default-dark-mode",
    method: "modrinth",
  },
  {
    identifier: "low-on-fire",
    method: "modrinth",
  },
  {
    identifier: "small-shield-totem",
    method: "modrinth",
  },
  {
    identifier: "even-better-enchants",
    method: "modrinth",
  },
  {
    identifier: "new-glowing-ores",
    method: "modrinth",
  },
]

export function get_resource_pack_list(): ResourcePackDefinition[] {
  const identifiers = new Set<string>()
  const duplicates: string[] = []

  for (const pack of resource_pack_list_raw) {
    if (identifiers.has(pack.identifier)) {
      duplicates.push(pack.identifier)
    }
    identifiers.add(pack.identifier)
  }

  if (duplicates.length > 0) {
    console.error(`Duplicate identifiers found in resource_pack_list: ${duplicates.join(", ")}`)
    process.exit(1)
  }

  return resource_pack_list_raw
}

export const resource_pack_list = get_resource_pack_list()
