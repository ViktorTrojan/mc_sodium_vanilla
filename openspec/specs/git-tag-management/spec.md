# git-tag-management Specification

## Purpose
TBD - created by archiving change automate-modpack-updates. Update Purpose after archive.
## Requirements
### Requirement: The system MUST list tags for a Minecraft version

The system SHALL be able to query git tags for a specific Minecraft version.

#### Scenario: Find existing tags for a version

**Given** tags "1.14_0.1.0", "1.14_0.1.1", "1.15_0.1.0" exist
**When** querying tags for Minecraft version "1.14"
**Then** it should return ["1.14_0.1.0", "1.14_0.1.1"]

#### Scenario: No tags exist for a version

**Given** no tags exist for Minecraft version "1.22"
**When** querying tags for "1.22"
**Then** it should return an empty array

### Requirement: The system MUST parse tag format

The system SHALL parse tags in the format `{MC_VERSION}_{MODPACK_VERSION}`.

#### Scenario: Parse standard tag

**Given** a tag "1.21.10_0.1.0"
**When** the tag is parsed
**Then** MC_VERSION should be "1.21.10"
**And** MODPACK_VERSION should be "0.1.0"

#### Scenario: Parse tag with single-digit minor version

**Given** a tag "1.14_0.1.0"
**When** the tag is parsed
**Then** MC_VERSION should be "1.14"
**And** MODPACK_VERSION should be "0.1.0"

#### Scenario: Reject invalid tag format

**Given** a tag that doesn't match the pattern (e.g., "v1.0.0", "release-1.14")
**When** the tag is parsed
**Then** it should return null or throw an error

### Requirement: The system MUST find latest tag for a version

The system SHALL identify the latest modpack version tag for a given Minecraft version.

#### Scenario: Find latest among multiple tags

**Given** tags "1.14_0.1.0", "1.14_0.1.1", "1.14_0.1.2" exist
**When** finding the latest tag for "1.14"
**Then** it should return "1.14_0.1.2"

#### Scenario: Single tag exists

**Given** only tag "1.15_0.1.0" exists
**When** finding the latest tag for "1.15"
**Then** it should return "1.15_0.1.0"

#### Scenario: No tags exist

**Given** no tags exist for "1.22"
**When** finding the latest tag
**Then** it should return null

### Requirement: The system MUST increment modpack version

The system SHALL increment the patch version of a modpack version.

#### Scenario: Increment patch version

**Given** a modpack version "0.1.0"
**When** incrementing the version
**Then** it should return "0.1.1"

#### Scenario: Increment higher patch version

**Given** a modpack version "0.1.9"
**When** incrementing the version
**Then** it should return "0.1.10"

#### Scenario: Start new version for new Minecraft version

**Given** no tag exists for a Minecraft version
**When** determining the initial version
**Then** it should return "0.1.0"

### Requirement: The system MUST create annotated tags

The system SHALL create annotated git tags with descriptive messages.

#### Scenario: Create new tag

**Given** a Minecraft version "1.21.10" and modpack version "0.1.0"
**When** creating a tag
**Then** it should create tag "1.21.10_0.1.0"
**And** the tag should be annotated with a message like "Release for Minecraft 1.21.10 (version 0.1.0)"

#### Scenario: Push tag to remote

**Given** a newly created tag
**When** pushing the tag
**Then** it should execute `git push origin {tag_name}`
**And** the tag should be available on the remote repository

### Requirement: The system MUST access files from a tag

The system SHALL be able to checkout a tag and read files from that snapshot.

#### Scenario: Read file from tag

**Given** a tag "1.14_0.1.0" exists
**And** that tag contains a file "mod_installation_state.json"
**When** checking out the tag
**Then** the file should be accessible for reading

#### Scenario: Return to original branch after checkout

**Given** the current branch is "main"
**When** a tag is checked out temporarily
**Then** the system should return to "main" branch after reading files

