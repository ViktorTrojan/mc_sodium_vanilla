# Implementation Tasks

**Change ID:** `refactor-mod-installation-state`

## Task Breakdown

### 1. Add ModInstallationState type to types.ts
**Estimated Effort:** 5 minutes

Add the new `ModInstallationState` interface to `modpack_creator/src/types.ts`:
```typescript
export interface ModInstallationState {
  successful: Array<{
    identifier: string;
    category: ModCategory;
  }>;
  failed: Array<{
    identifier: string;
    category: ModCategory;
    attemptedAlternatives?: Array<{
      identifier: string;
      method: "modrinth";
    }>;
  }>;
  alternativeInstalled: Array<{
    identifier: string;
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

**Validation:**
- Run `bun run check` to ensure TypeScript compiles
- Verify no type errors

---

### 2. Create read_installation_state.ts module
**Estimated Effort:** 15 minutes

Create `modpack_creator/src/read_installation_state.ts` with the `load_installation_state()` function.

**Implementation Requirements:**
- Use `Bun.file()` API for reading
- Handle file not found by returning empty state
- Validate JSON structure (check for required fields: `successful`, `failed`, `alternativeInstalled`)
- Throw descriptive errors for malformed JSON or missing fields
- Export async function with proper return type

**Validation:**
- Run `bun run check` to verify TypeScript types
- Manually test by creating a test JSON file and calling the function
- Test error cases: missing file, malformed JSON, missing fields

---

### 3. Refactor save_missing_mod_list_json() in write_mod_list.ts
**Estimated Effort:** 20 minutes

Rename and refactor the function to `save_installation_state()` with new logic:

**Changes:**
1. Rename function to `save_installation_state`
2. Update filename from `missing_mod_list.json` to `mod_installation_state.json`
3. Replace `node:fs` `writeFileSync` with `Bun.write()`
4. Refactor logic to categorize mods into three arrays:
   - `successful`: mods NOT in `mod_installation_details` Map
   - `failed`: mods in Map with `null` value
   - `alternativeInstalled`: mods in Map with non-null value
5. Build the new `ModInstallationState` structure
6. Add error handling for write failures (try-catch, log but don't crash)

**Validation:**
- Run `bun run check` to verify TypeScript compiles
- Build the modpack and verify the new JSON file is created with correct structure
- Inspect the JSON file manually to ensure data is categorized correctly

---

### 4. Update index.ts to use new function name
**Estimated Effort:** 5 minutes

Update [modpack_creator/src/index.ts:113](modpack_creator/src/index.ts#L113) to call the renamed function:

**Changes:**
- Change `save_missing_mod_list_json()` to `save_installation_state()`
- Update import statement if function name changed

**Validation:**
- Run `bun run check` to ensure no import errors
- Verify function is called correctly in the build pipeline

---

### 5. Update .packwizignore if needed
**Estimated Effort:** 2 minutes

Check if `.packwizignore` references `missing_mod_list.json` and update to `mod_installation_state.json`.

**Validation:**
- Search for `missing_mod_list.json` in `.packwizignore`
- If found, replace with `mod_installation_state.json`
- If not found, no action needed

---

### 6. Remove old missing_mod_list.json file
**Estimated Effort:** 1 minute

Delete the existing `missing_mod_list.json` file from the project root if it exists.

**Validation:**
- Run `ls missing_mod_list.json` to verify file is deleted
- Ensure new file `mod_installation_state.json` is created after next build

---

### 7. Run full quality checks and test build
**Estimated Effort:** 10 minutes

**Commands:**
```bash
bun run check_and_test  # Run linter, type check, and tests
bun run build           # Or appropriate build command
```

**Validation:**
- All TypeScript type checks pass
- Biome linter shows no errors
- Build completes successfully
- `mod_installation_state.json` is created with correct structure
- No `missing_mod_list.json` file exists

---

### 8. Manual verification of JSON output
**Estimated Effort:** 5 minutes

Inspect the generated `mod_installation_state.json` file and verify:
- All three arrays (`successful`, `failed`, `alternativeInstalled`) are present
- Successful mods are in the `successful` array
- Failed mods with no alternatives are in the `failed` array
- Mods with installed alternatives are in the `alternativeInstalled` array with correct alternative identifier
- JSON is properly formatted (2-space indentation)

**Validation:**
- Compare against current `missing_mod_list.json` to ensure no data loss
- Verify the file structure matches the spec

---

## Task Dependencies

```
1 (Add types) → 2 (Create read module)
              → 3 (Refactor write function) → 4 (Update index.ts)
                                            → 5 (Update packwizignore)
                                            → 6 (Remove old file)
                                            → 7 (QA checks)
                                            → 8 (Manual verification)
```

**Parallelizable Work:**
- Tasks 1 and 2 can be done in parallel
- Tasks 5 and 6 can be done in parallel
- Task 3 depends on Task 1 (types must exist)
- Tasks 4-8 depend on Task 3 (refactored function must exist)

---

## Estimated Total Time

**Total:** ~63 minutes (~1 hour)

## Rollback Plan

If issues are discovered after implementation:
1. Revert commits related to this change
2. The old `save_missing_mod_list_json()` function can be restored from git history
3. Restore `missing_mod_list.json` file if needed
4. No data loss risk since this is a build-time artifact (not user data)
