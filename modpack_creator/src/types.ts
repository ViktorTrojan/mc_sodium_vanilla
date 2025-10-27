export type ModCategory = "optimization" | "cheating" | "useful" | "visual"

export interface ModDefinitionSimple {
  method: "modrinth"
  identifier: string
}

export interface ModDefinition extends ModDefinitionSimple {
  category: ModCategory
  alternatives?: ModDefinitionSimple[]
}

export interface ResourcePackDefinition {
  method: "modrinth"
  identifier: string
  alternatives?: ResourcePackDefinition[]
}

export interface MissingModEntry {
  identifier: string
  category: ModCategory
  alternatives?: ModDefinitionSimple[]
  installedAlternative?: ModDefinitionSimple
}

export interface InstallationResult {
  failed_mods: string[]
  mod_installation_details: Map<string, ModDefinitionSimple | null>
}
