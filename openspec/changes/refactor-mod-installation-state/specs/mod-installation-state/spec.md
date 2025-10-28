# Mod Installation State Tracking

**Capability:** Comprehensive tracking of mod installation outcomes
**Status:** NEW

## Overview

This spec defines how the modpack builder tracks and persists the installation state of all mods, including successful installations, failures, and alternative mod substitutions. It provides both write (persistence) and read (loading) capabilities for the installation state.

---

## ADDED Requirements

### Requirement: The system MUST persist comprehensive installation state to JSON file

The system MUST save the installation state of all mods to a JSON file named `mod_installation_state.json` in the project root directory.

**Functional Requirements:**
- Save installation state for ALL mods in the mod list (not just failures)
- Include three categories of mods in the state file:
  1. Successfully installed mods (main package installed as requested)
  2. Failed mods with no alternatives (complete failures)
  3. Failed mods with successful alternative installations
- Use `Bun.write()` API for file I/O operations
- Format JSON with 2-space indentation for human readability
- Overwrite the file on each build (no append behavior)
- Log the file path when successfully saved

**Data Model:**
```typescript
interface ModInstallationState {
  // Successfully installed mods (main package)
  successful: Array<{
    identifier: string;
    category: ModCategory;
  }>;

  // Failed mods with no successful alternative
  failed: Array<{
    identifier: string;
    category: ModCategory;
    attemptedAlternatives?: Array<{
      identifier: string;
      method: "modrinth";
    }>;
  }>;

  // Mods where main package failed but alternative succeeded
  alternativeInstalled: Array<{
    identifier: string;  // Original mod identifier
    category: ModCategory;
    attemptedAlternatives: Array<{
      identifier: string;
      method: "modrinth";
    }>;
    installedAlternative: {
      identifier: string;
      method: "modrinth";
    };
  }>;
}
```

**Technical Constraints:**
- Must be compatible with Bun runtime (no Node.js-specific APIs like `fs.writeFileSync`)
- File path must be relative to project root
- Must handle write errors gracefully (log error but don't crash the build)

#### Scenario: All mods install successfully

**Given** a mod list with 10 mods and all install successfully via PackWiz
**When** the installation state is saved
**Then** the `mod_installation_state.json` file contains:
- 10 entries in the `successful` array
- 0 entries in the `failed` array
- 0 entries in the `alternativeInstalled` array

#### Scenario: Some mods fail without alternatives

**Given** a mod list with 10 mods where 2 mods fail and have no alternatives defined
**When** the installation state is saved
**Then** the `mod_installation_state.json` file contains:
- 8 entries in the `successful` array
- 2 entries in the `failed` array with the failed mod identifiers
- 0 entries in the `alternativeInstalled` array

#### Scenario: Mod fails but alternative succeeds

**Given** a mod "jei" with alternatives ["rei", "emi"] where "jei" fails but "emi" succeeds
**When** the installation state is saved
**Then** the `mod_installation_state.json` file contains:
- 0 entries in `successful` for "jei"
- 0 entries in `failed` for "jei"
- 1 entry in `alternativeInstalled` with:
  - `identifier`: "jei"
  - `installedAlternative.identifier`: "emi"
  - `attemptedAlternatives`: ["rei", "emi"]

#### Scenario: File write operation fails

**Given** the project root directory is read-only or disk is full
**When** the system attempts to save the installation state
**Then** an error is logged to the console
**And** the build process continues without crashing

---

### Requirement: The system MUST provide a function to load installation state from JSON file

The system MUST provide a function to read and parse the `mod_installation_state.json` file into TypeScript types.

**Functional Requirements:**
- Export a function `load_installation_state()` that reads the JSON file
- Use `Bun.file()` API for file I/O operations
- Return typed data matching the `ModInstallationState` interface
- Validate that required fields exist in the JSON structure
- Handle missing file gracefully (return empty state structure)
- Handle malformed JSON gracefully (throw descriptive error)

**Function Signature:**
```typescript
export async function load_installation_state(): Promise<ModInstallationState>
```

**Error Handling:**
- If file doesn't exist: Return empty state `{ successful: [], failed: [], alternativeInstalled: [] }`
- If JSON is malformed: Throw error with message describing the issue
- If required fields are missing: Throw error listing missing fields

**Technical Constraints:**
- Must use async/await (Bun.file() returns promises)
- Must use Bun's native file APIs (not Node.js `fs` module)
- Must be exported from a dedicated module (e.g., `read_installation_state.ts`)

#### Scenario: Load existing valid state file

**Given** a `mod_installation_state.json` file exists with valid structure
**When** `load_installation_state()` is called
**Then** it returns a `ModInstallationState` object with all arrays populated correctly
**And** the data matches the JSON file contents

#### Scenario: Load state when file doesn't exist

**Given** no `mod_installation_state.json` file exists in the project root
**When** `load_installation_state()` is called
**Then** it returns `{ successful: [], failed: [], alternativeInstalled: [] }`
**And** no error is thrown

#### Scenario: Load state with malformed JSON

**Given** a `mod_installation_state.json` file exists but contains invalid JSON syntax
**When** `load_installation_state()` is called
**Then** it throws an error with message "Failed to parse mod_installation_state.json: [error details]"

#### Scenario: Load state with missing required fields

**Given** a `mod_installation_state.json` file exists but is missing the `successful` field
**When** `load_installation_state()` is called
**Then** it throws an error with message "Invalid mod_installation_state.json: missing required field 'successful'"

---

### Requirement: The system MUST remove legacy missing_mod_list.json file

The system MUST stop generating `missing_mod_list.json` and remove any references to it.

**Functional Requirements:**
- Delete or rename the `save_missing_mod_list_json()` function to reflect new behavior
- Update all call sites to use the new function name
- Do NOT maintain backward compatibility with old filename
- Update `.packwizignore` or similar files if they reference the old filename

#### Scenario: Build completes without creating missing_mod_list.json

**Given** a fresh build is initiated
**When** the build completes successfully
**Then** no `missing_mod_list.json` file exists in the project root
**And** a `mod_installation_state.json` file exists instead

---

## Implementation Notes

**Recommended Module Structure:**
- `write_mod_list.ts` - Rename `save_missing_mod_list_json()` to `save_installation_state()` and refactor to new structure
- `read_installation_state.ts` - NEW module exporting `load_installation_state()`
- `types.ts` - Add `ModInstallationState` interface

**Migration from InstallationResult:**
The existing `InstallationResult` type returns:
```typescript
{
  failed_mods: string[],
  mod_installation_details: Map<string, ModDefinitionSimple | null>
}
```

The new save function should:
1. Iterate through all mods in the original mod list
2. Check if the mod identifier exists in `mod_installation_details` Map
3. If NOT in Map: mod was successful → add to `successful` array
4. If in Map with `null` value: mod failed → add to `failed` array
5. If in Map with non-null value: alternative was installed → add to `alternativeInstalled` array

**Bun API Usage:**
```typescript
// Writing
await Bun.write("mod_installation_state.json", JSON.stringify(state, null, 2));

// Reading
const file = Bun.file("mod_installation_state.json");
const exists = await file.exists();
if (!exists) return emptyState;
const json = await file.json();
```
