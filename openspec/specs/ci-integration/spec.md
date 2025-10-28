# ci-integration Specification

## Purpose
TBD - created by archiving change automate-modpack-updates. Update Purpose after archive.
## Requirements
### Requirement: The system MUST run as a daily scheduled workflow

The system SHALL run automatically on a daily schedule.

#### Scenario: Run at 1am UTC daily

**Given** the workflow is configured
**When** the time is 1:00 AM UTC
**Then** the workflow should trigger automatically

#### Scenario: Cron syntax

**Given** the workflow schedule
**When** examining the cron expression
**Then** it should be `0 1 * * *` (1am UTC every day)

### Requirement: The system MUST support manual workflow dispatch

The system SHALL allow manual triggering for testing and emergency updates.

#### Scenario: Trigger manually from GitHub UI

**Given** a user has write access to the repository
**When** they trigger the workflow manually from GitHub Actions UI
**Then** the workflow should run immediately

### Requirement: The workflow MUST checkout with full git history

The workflow SHALL checkout the repository with full git history to access tags.

#### Scenario: Clone with full history

**Given** the workflow is running
**When** checking out the repository
**Then** it should use `fetch-depth: 0` to fetch all history
**And** all git tags should be available

### Requirement: The workflow MUST setup runtime dependencies

The workflow SHALL install Bun, Go, and packwiz.

#### Scenario: Setup Bun

**Given** the workflow is running
**When** setting up dependencies
**Then** it should install the latest version of Bun
**And** Bun should be available in PATH

#### Scenario: Setup Go and packwiz

**Given** the workflow is running
**When** setting up dependencies
**Then** it should install Go stable version
**And** install packwiz via `go install github.com/packwiz/packwiz@latest`
**And** add `$HOME/go/bin` to PATH

#### Scenario: Install Node dependencies

**Given** Bun is installed
**When** setting up dependencies
**Then** it should run `bun install` in the modpack_creator directory

### Requirement: The workflow MUST configure git identity

The workflow SHALL configure git for commits and tags.

#### Scenario: Set git user

**Given** the workflow is running
**When** configuring git
**Then** user.name should be "github-actions[bot]"
**And** user.email should be "github-actions[bot]@users.noreply.github.com"

### Requirement: The workflow MUST provide Modrinth credentials

The workflow SHALL provide Modrinth API credentials via environment variables.

#### Scenario: Set environment variables

**Given** the auto-update script is running
**When** accessing configuration
**Then** `MODRINTH_PAT_TOKEN` should be available from secrets
**And** `MODRINTH_PROJECT_ID` should be available from secrets
**And** `MODRINTH_CLIENT_ID` should be available from secrets
**And** `MODRINTH_CLIENT_SECRET` should be available from secrets

### Requirement: The workflow MUST run auto-update script

The workflow SHALL execute the auto-update script.

#### Scenario: Execute auto-update

**Given** all dependencies are installed
**When** running the build step
**Then** it should execute `bun run auto-update`
**And** capture stdout and stderr

#### Scenario: Fail workflow on script error

**Given** the auto-update script exits with non-zero code
**When** the workflow completes
**Then** the workflow should be marked as failed
**And** send notification to maintainers

### Requirement: The workflow MUST have appropriate permissions

The workflow SHALL have appropriate permissions to push commits and tags.

#### Scenario: Grant contents write permission

**Given** the workflow is configured
**When** examining permissions
**Then** it should have `contents: write` permission
**And** be able to push commits and tags to the repository

