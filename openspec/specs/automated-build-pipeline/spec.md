# automated-build-pipeline Specification

## Purpose
TBD - created by archiving change automate-modpack-updates. Update Purpose after archive.
## Requirements
### Requirement: The system MUST process all Minecraft versions

The system SHALL iterate through all discovered Minecraft versions and process each one.

#### Scenario: Process multiple versions

**Given** versions ["1.14", "1.14.1", "1.15"] are discovered
**When** the auto-update script runs
**Then** it should process each version sequentially
**And** log progress for each version

#### Scenario: Continue on individual version failure

**Given** version "1.14" fails during build
**When** the auto-update script runs
**Then** it should log the error
**And** continue processing "1.14.1" and subsequent versions

### Requirement: The system MUST set environment variable per version

The system SHALL set the `MC_VERSION` environment variable for each Minecraft version being processed.

#### Scenario: Set MC_VERSION before build

**Given** processing Minecraft version "1.21.10"
**When** preparing to build the modpack
**Then** `process.env.MC_VERSION` should be set to "1.21.10"

#### Scenario: Environment persists during build

**Given** MC_VERSION is set to "1.21.10"
**When** the modpack build process reads the config
**Then** it should use "1.21.10" as the target version

### Requirement: The system MUST build both modpack variants

The system SHALL build both safe and full variants of the modpack for each version.

#### Scenario: Build safe variant

**Given** MC_VERSION is set
**When** building the modpack
**Then** it should run the build process with safe mod list
**And** generate a .mrpack file for the safe variant

#### Scenario: Build full variant

**Given** MC_VERSION is set
**When** building the modpack
**Then** it should run the build process with full mod list
**And** generate a .mrpack file for the full variant

#### Scenario: Save installation state

**Given** the full variant is built
**When** the build completes
**Then** it should save `mod_installation_state.json` to the repository root
**And** the file should contain successful, failed, and alternative_installed arrays

### Requirement: The system MUST detect changes using update detector

The system SHALL use the update detector to determine if a modpack has changed.

#### Scenario: Skip upload if no changes

**Given** a tag "1.14_0.1.0" exists for Minecraft version "1.14"
**And** the new build produces identical installation state
**When** checking if upload is needed
**Then** it should skip the Modrinth upload
**And** not create a new tag
**And** log "NO CHANGES" for that version

#### Scenario: Upload if changes detected

**Given** a tag "1.14_0.1.0" exists
**And** the new build has different installation state
**When** checking if upload is needed
**Then** it should proceed with Modrinth upload

#### Scenario: Upload for new versions

**Given** no tag exists for Minecraft version "1.22"
**When** checking if upload is needed
**Then** it should proceed with Modrinth upload (first release)

### Requirement: The system MUST upload to Modrinth

The system SHALL upload both variants to Modrinth when changes are detected.

#### Scenario: Upload safe variant

**Given** changes are detected for version "1.21.10"
**When** uploading to Modrinth
**Then** it should call `upload_to_modrinth` for the safe .mrpack file
**And** use version number format "{MC_VERSION}_safe"
**And** use title format "Sodium Vanilla {MC_VERSION} (Safe)"

#### Scenario: Upload full variant

**Given** changes are detected for version "1.21.10"
**When** uploading to Modrinth
**Then** it should call `upload_to_modrinth` for the full .mrpack file
**And** use version number format "{MC_VERSION}_full"
**And** use title format "Sodium Vanilla {MC_VERSION} (Full)"

#### Scenario: Upload both variants even if safe unchanged

**Given** the full variant has changes
**And** the safe variant theoretically has no changes
**When** uploading to Modrinth
**Then** it should upload both safe and full variants
**Because** `mod_installation_state.json` reflects the full version only

### Requirement: The system MUST create and push git tags

The system SHALL create git tags when changes are detected or for new versions.

#### Scenario: Increment tag for existing version

**Given** the latest tag for "1.14" is "1.14_0.1.0"
**And** changes are detected
**When** creating a new tag
**Then** it should create tag "1.14_0.1.1"

#### Scenario: Create first tag for new version

**Given** no tag exists for "1.22"
**When** creating a new tag
**Then** it should create tag "1.22_0.1.0"

#### Scenario: Commit changes before tagging

**Given** the build produced updated files
**When** creating a tag
**Then** it should commit all changes (mods, installation state, README)
**And** create an annotated tag
**And** push both the commit and tag to origin

### Requirement: The system MUST provide progress logging

The system SHALL provide clear progress logging during execution.

#### Scenario: Log version progress

**Given** processing 38 Minecraft versions
**When** the script runs
**Then** it should log "[N/38] Minecraft {VERSION}" for each version

#### Scenario: Log decisions

**Given** processing a version
**When** a decision is made (upload, skip, etc.)
**Then** it should log the decision with appropriate symbols (✓, ⏭, !)

#### Scenario: Summary at end

**Given** the script completes processing all versions
**When** logging the summary
**Then** it should report total processed, uploaded, skipped, and failed counts

### Requirement: The system MUST provide error handling and reporting

The system SHALL collect errors and report them at the end of execution.

#### Scenario: Collect errors per version

**Given** version "1.14" fails with an error
**When** the script continues
**Then** it should store the error details
**And** report all errors at the end

#### Scenario: Exit with error code on failures

**Given** at least one version failed
**When** the script completes
**Then** it should exit with a non-zero exit code

### Requirement: The system MUST add auto-update script to package.json

The system SHALL add a new npm script to run the auto-update process.

#### Scenario: Add auto-update script

**Given** the `auto_update.ts` file exists
**When** updating `package.json`
**Then** it should add script `"auto-update": "bun src/auto_update.ts"`

#### Scenario: Run via npm/bun

**Given** the script is added to package.json
**When** running `bun run auto-update`
**Then** it should execute the auto-update pipeline

