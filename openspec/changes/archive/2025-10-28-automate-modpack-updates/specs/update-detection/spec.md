# Spec: Update Detection

**Capability:** update-detection
**Status:** Proposed

## Overview

Implement functionality to compare mod installation states between the current build and a previous git tag to determine if a modpack has changed and needs to be uploaded.

## ADDED Requirements

### Requirement: The system MUST load installation state from git tag

The system SHALL be able to load `mod_installation_state.json` from a specific git tag.

#### Scenario: Load state from existing tag

**Given** a tag "1.14_0.1.0" exists
**And** that tag contains a valid "mod_installation_state.json" file
**When** loading the installation state from the tag
**Then** it should return a parsed `ModInstallationState` object

#### Scenario: Handle missing file in tag

**Given** a tag "1.14_0.1.0" exists
**And** that tag does not contain "mod_installation_state.json"
**When** loading the installation state from the tag
**Then** it should return an empty state or null

#### Scenario: Handle malformed JSON in tag

**Given** a tag contains a malformed "mod_installation_state.json"
**When** loading the installation state from the tag
**Then** it should log a warning
**And** return null or empty state

### Requirement: The system MUST compare installation states

The system SHALL compare two `ModInstallationState` objects to detect changes.

#### Scenario: Identical states

**Given** two installation states with identical successful, failed, and alternative_installed arrays
**When** comparing the states
**Then** it should return `false` (no changes)

#### Scenario: Different successful mods

**Given** state A has successful mod "sodium"
**And** state B has successful mods "sodium" and "lithium"
**When** comparing the states
**Then** it should return `true` (changes detected)

#### Scenario: Different failed mods

**Given** state A has failed mod "xray"
**And** state B has no failed mods
**When** comparing the states
**Then** it should return `true` (changes detected)

#### Scenario: Different alternative mods

**Given** state A has alternative_installed mod "indium"
**And** state B has no alternative_installed mods
**When** comparing the states
**Then** it should return `true` (changes detected)

#### Scenario: Same mods, different order

**Given** state A has successful mods ["sodium", "lithium"]
**And** state B has successful mods ["lithium", "sodium"]
**When** comparing the states
**Then** it should return `false` (order doesn't matter, no changes)

### Requirement: The system MUST handle new Minecraft versions

The system SHALL correctly handle Minecraft versions that have no previous tag.

#### Scenario: First build for new version

**Given** Minecraft version "1.22" has no existing tags
**When** checking if an update is needed
**Then** it should return `true` (always upload for new versions)

### Requirement: The system MUST perform deep comparison logic

The system SHALL perform deep comparison of mod definitions, not just array lengths.

#### Scenario: Mod category changed

**Given** state A has mod with identifier "sodium" and category "optimization"
**And** state B has mod with identifier "sodium" and category "cheating"
**When** comparing the states
**Then** it should return `true` (mod metadata changed)

#### Scenario: Alternative mod details changed

**Given** state A has alternative mod with specific identifier
**And** state B has a different alternative mod for the same parent
**When** comparing the states
**Then** it should return `true` (alternative changed)

## Related Capabilities

- **git-tag-management**: Uses tag checkout to access historical states
- **automated-build-pipeline**: Uses comparison result to decide whether to upload
