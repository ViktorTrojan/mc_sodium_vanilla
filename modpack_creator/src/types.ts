export type ModCategory = "optimization" | "cheating" | "useful" | "visual"

export interface ModDefinitionSimple {
  method: "modrinth"
  identifier: string
}

export interface ModDefinition {
  method: "modrinth"
  identifier: string
  category: ModCategory
}

export interface ModDefinitionWithAlternatives extends ModDefinition {
  alternatives?: ModDefinitionSimple[]
}

// uses same structure as normal mod definitions
export type ResourceDefinition = ModDefinitionSimple
export interface ResourcePackDefinitionWithAlternatives extends ResourceDefinition {
  alternatives?: ResourceDefinition[]
}

export interface ModInstallationState {
  successful: Array<ModDefinition> // successfully installed main mods, alternatives are excluded from this one
  failed: Array<ModDefinitionWithAlternatives> // the mods that failed to install, includes failed to install alternative mods
  alternative_installed: Array<ModDefinitionWithAlternatives> // successfully installed alternative mods, contains information to the parent identifier
}
