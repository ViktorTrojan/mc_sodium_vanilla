export type ModCategory = "optimization" | "cheating" | "useful" | "visual"

export interface ModDefinition {
  method: "modrinth"
  identifier: string
  category: ModCategory
  alternatives?: ModDefinition[]
}

export interface ResourcePackDefinition {
  method: "modrinth"
  identifier: string
  alternatives?: ResourcePackDefinition[]
}

export interface InstalledAlternative {
  identifier: string
  category: ModCategory
}

export interface MissingModEntry {
  identifier: string
  category: ModCategory
  alternatives?: ModDefinition[]
  installedAlternative?: InstalledAlternative
}

export interface InstallationResult {
  failed_mods: string[]
  mod_installation_details: Map<string, InstalledAlternative | null>
}
