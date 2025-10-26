
export type ModCategory = "optimization" | "cheating" | "useful" | "visual"

export interface ModDefinition {
  method: 'modrinth'
  identifier: string
  category: ModCategory
  alternatives?: ModDefinition[]
}

export interface ResourcePackDefinition {
  method: 'modrinth'
  identifier: string
  alternatives?: ResourcePackDefinition[]
}
