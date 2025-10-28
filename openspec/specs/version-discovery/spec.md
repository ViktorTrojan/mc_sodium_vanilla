# version-discovery Specification

## Purpose
TBD - created by archiving change automate-modpack-updates. Update Purpose after archive.
## Requirements
### Requirement: The system MUST fetch Minecraft versions from Modrinth API

The system SHALL fetch the list of Minecraft game versions from the Modrinth API.

#### Scenario: Successful API call

**Given** the Modrinth API is accessible at `https://api.modrinth.com/v2/tag/game_version`
**When** the version discovery function is called
**Then** it should make a GET request to the API
**And** return a list of game versions

#### Scenario: Handle API errors with retry

**Given** the Modrinth API returns an error on the first attempt
**And** succeeds on the second attempt
**When** the version discovery function is called
**Then** it should use `fetch_with_retry` to retry the request
**And** eventually return the successful response

### Requirement: The system MUST filter for release versions only

The system SHALL filter versions to include only those with `version_type === "release"`.

#### Scenario: Exclude snapshots

**Given** the API returns versions including snapshots like "25w41a"
**When** the versions are filtered
**Then** snapshots should be excluded from the result
**And** only versions with `version_type: "release"` should be included

#### Scenario: Exclude release candidates

**Given** the API returns versions including "1.21.10-rc1"
**When** the versions are filtered
**Then** release candidates should be excluded from the result

### Requirement: The system MUST filter for versions >= 1.14

The system SHALL filter versions to include only Minecraft 1.14 and later.

#### Scenario: Include valid versions

**Given** the API returns versions "1.14", "1.14.1", "1.16", "1.21.10", "2.0.0"
**When** the versions are filtered
**Then** all of these versions should be included in the result

#### Scenario: Exclude versions below 1.14

**Given** the API returns version "1.13.3"
**When** the versions are filtered
**Then** "1.13.3" should be excluded from the result

#### Scenario: Exclude pre-1.14 versions with different format

**Given** the API returns version "b1.16.6" (beta format)
**When** the versions are filtered
**Then** "b1.16.6" should be excluded from the result

### Requirement: The system MUST support version parsing and comparison

The system SHALL parse Minecraft version strings and compare them semantically.

#### Scenario: Parse standard version format

**Given** a version string "1.21.10"
**When** the version is parsed
**Then** it should be parsed as major=1, minor=21, patch=10

#### Scenario: Parse version without patch

**Given** a version string "1.14"
**When** the version is parsed
**Then** it should be parsed as major=1, minor=14, patch=0

#### Scenario: Compare major version 2.x

**Given** a version "2.0.0"
**When** compared to the 1.14 minimum
**Then** it should be considered valid (major version 2 >= 1)

#### Scenario: Reject invalid version formats

**Given** a version string that doesn't match the expected pattern (e.g., "25w41a", "b1.16.6")
**When** the version is parsed
**Then** it should be rejected as invalid

### Requirement: The system MUST include testing for version discovery

The system SHALL include tests to validate version discovery functionality.

#### Scenario: Test with real API

**Given** the Modrinth API is accessible
**When** the version discovery test is run
**Then** it should successfully fetch versions
**And** return at least one valid version >= 1.14
**And** all returned versions should be release versions

#### Scenario: Test filtering logic

**Given** a mock API response with mixed version types
**When** the filter is applied
**Then** only valid release versions >= 1.14 should remain

