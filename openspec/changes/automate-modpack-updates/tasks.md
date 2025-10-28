# Tasks: Automate Modpack Updates

**Change ID:** `automate-modpack-updates`

## Implementation Order

Tasks are ordered to deliver incremental value while maintaining dependencies. Capabilities are built bottom-up (utilities first, then consumers).

---

## Phase 1: Foundation (Fetch Utility)

### Task 1.1: Create fetch utility module
- Create `modpack_creator/src/utils/` directory
- Create `modpack_creator/src/utils/fetch_with_retry.ts`
- Extract `fetch_with_retry` function from `write_mod_list.ts`
- Export function with proper TypeScript types
- Add JSDoc comments

**Validation**: Function compiles without errors

**Dependencies**: None

---

### Task 1.2: Update write_mod_list.ts to use new utility
- Import `fetch_with_retry` from `utils/fetch_with_retry`
- Remove the local `fetch_with_retry` function definition
- Verify all existing call sites work

**Validation**: Existing tests pass; no behavior changes

**Dependencies**: Task 1.1

---

### Task 1.3: Add tests for fetch utility
- Create `modpack_creator/src/utils/fetch_with_retry.test.ts`
- Test successful request (no retries)
- Test retry on network error with exponential backoff
- Test retry on HTTP 429 (rate limit)
- Test exhausting retries and throwing error
- Test custom retry count and initial delay

**Validation**: Run `bun test` and verify all tests pass

**Dependencies**: Task 1.1

---

## Phase 2: Version Discovery

### Task 2.1: Implement version discovery module
- Create `modpack_creator/src/version_discovery.ts`
- Define `GameVersion` interface matching Modrinth API response
- Implement `fetch_minecraft_versions()` function
  - Use `fetch_with_retry` to call Modrinth API
  - Parse JSON response
- Implement `filter_valid_versions()` function
  - Filter for `version_type === "release"`
  - Filter for versions >= 1.14
  - Use regex or parsing to validate version format
- Export `get_current_minecraft_versions()` as main entry point

**Validation**: Function compiles and returns expected type

**Dependencies**: Task 1.1 (fetch utility)

---

### Task 2.2: Add version parsing and comparison
- Implement `parse_version(version: string)` helper
  - Return `{ major: number, minor: number, patch: number } | null`
  - Handle versions like "1.14", "1.21.10", "2.0.0"
  - Return null for invalid formats
- Implement `is_valid_version(version: string)` predicate
  - Check major >= 1
  - If major === 1, check minor >= 14
  - If major >= 2, always valid
- Use in `filter_valid_versions()`

**Validation**: Edge cases covered (1.13.3, 1.14, 2.0.0, b1.16.6)

**Dependencies**: Task 2.1

---

### Task 2.3: Add tests for version discovery
- Create `modpack_creator/src/version_discovery.test.ts`
- Test version parsing (valid and invalid formats)
- Test version comparison logic
- Test filtering with mock API data
- Test real API call (integration test)
  - Verify at least one version returned
  - Verify all returned versions are valid

**Validation**: Run `bun test` and verify all tests pass

**Dependencies**: Task 2.1, Task 2.2

---

## Phase 3: Git Tag Management

### Task 3.1: Implement tag listing and parsing
- Create `modpack_creator/src/git_tag_manager.ts`
- Implement `list_tags_for_version(mc_version: string)` using `Bun.$`
  - Run `git tag -l "${mc_version}_*"`
  - Parse output into string array
- Implement `parse_tag(tag: string)`
  - Use regex to match `{MC_VERSION}_{MODPACK_VERSION}`
  - Return `{ mc_version: string, modpack_version: string } | null`

**Validation**: Functions compile and handle edge cases

**Dependencies**: None (uses Bun runtime)

---

### Task 3.2: Implement tag operations
- Implement `find_latest_tag(mc_version: string)`
  - List tags for version
  - Parse and sort by modpack version
  - Return latest or null
- Implement `increment_version(version: string)`
  - Parse semantic version (e.g., "0.1.0")
  - Increment patch number
  - Return new version string
- Implement `create_tag(tag_name: string, message: string)`
  - Run `git tag -a ${tag_name} -m ${message}`
- Implement `push_tag(tag_name: string)`
  - Run `git push origin ${tag_name}`

**Validation**: Functions work with test git repository

**Dependencies**: Task 3.1

---

### Task 3.3: Implement tag checkout for file access
- Implement `checkout_tag(tag_name: string)`
  - Run `git checkout ${tag_name}`
- Implement `checkout_branch(branch: string)`
  - Run `git checkout ${branch}`
- Implement `read_file_from_tag(tag_name: string, file_path: string)`
  - Checkout tag
  - Read file using `Bun.file()`
  - Checkout back to original branch
  - Return file contents

**Validation**: Can read files from existing tags

**Dependencies**: Task 3.1

---

### Task 3.4: Add tests for git tag manager
- Create `modpack_creator/src/git_tag_manager.test.ts`
- Test tag parsing (valid and invalid formats)
- Test version increment logic
- Test finding latest tag among multiple
- Mock `Bun.$` for git command tests
- Test tag creation and push (in isolated test repo)

**Validation**: Run `bun test` and verify all tests pass

**Dependencies**: Task 3.1, Task 3.2, Task 3.3

---

## Phase 4: Update Detection

### Task 4.1: Implement state loading from tag
- Create `modpack_creator/src/update_detector.ts`
- Implement `load_state_from_tag(tag_name: string)`
  - Use `read_file_from_tag()` from git_tag_manager
  - Parse JSON to `ModInstallationState`
  - Handle missing file (return empty state)
  - Handle parse errors (return null)

**Validation**: Can load state from existing tags

**Dependencies**: Task 3.3 (tag checkout)

---

### Task 4.2: Implement state comparison
- Implement `compare_states(old_state: ModInstallationState, new_state: ModInstallationState)`
  - Deep compare `successful` arrays (identifier + category)
  - Deep compare `failed` arrays
  - Deep compare `alternative_installed` arrays
  - Return boolean (true if different)
- Implement helper `normalize_mod_array()` to sort arrays for order-independent comparison

**Validation**: Comparison logic handles all edge cases

**Dependencies**: None (pure logic)

---

### Task 4.3: Implement main update detection function
- Implement `needs_update(mc_version: string, new_state: ModInstallationState)`
  - Find latest tag for mc_version
  - If no tag: return true (new version)
  - Load old state from tag
  - Compare states
  - Return comparison result

**Validation**: Correctly identifies when updates are needed

**Dependencies**: Task 4.1, Task 4.2

---

### Task 4.4: Add tests for update detector
- Create `modpack_creator/src/update_detector.test.ts`
- Test state comparison with identical states
- Test state comparison with different successful mods
- Test state comparison with different failed mods
- Test state comparison with different alternative mods
- Test state comparison with same mods, different order
- Test new version handling (no tag exists)

**Validation**: Run `bun test` and verify all tests pass

**Dependencies**: Task 4.1, Task 4.2, Task 4.3

---

## Phase 5: Automated Build Pipeline

### Task 5.1: Create auto-update script structure
- Create `modpack_creator/src/auto_update.ts`
- Import all dependencies (version_discovery, git_tag_manager, update_detector, etc.)
- Define `main()` async function
- Add error handling wrapper
- Add progress logging utilities

**Validation**: Script runs without errors (even if empty)

**Dependencies**: All previous tasks

---

### Task 5.2: Implement version iteration logic
- In `main()`, call `get_current_minecraft_versions()`
- Loop through each version with index
- Log progress: `[N/Total] Minecraft {version}`
- Wrap each version processing in try-catch
- Collect errors for summary report

**Validation**: Logs all versions correctly

**Dependencies**: Task 2.1 (version discovery)

---

### Task 5.3: Implement per-version build logic
- For each version:
  - Set `process.env.MC_VERSION = mc_version`
  - Find latest tag or determine this is first build
  - Calculate next modpack version
  - Call existing build logic (import from `index.ts`)
    - Build safe variant
    - Build full variant
    - Save installation state
  - Store new installation state in memory

**Validation**: Can build modpack for a single version

**Dependencies**: Task 5.1, Task 3.2 (tag operations)

**Note**: May need to refactor `index.ts` to export reusable functions

---

### Task 5.4: Implement change detection and upload logic
- After build, call `needs_update(mc_version, new_state)`
- If no update needed:
  - Log "NO CHANGES" and skip upload
- If update needed:
  - Upload safe variant to Modrinth
  - Upload full variant to Modrinth
  - Use existing `upload_to_modrinth` function

**Validation**: Correctly skips unchanged versions

**Dependencies**: Task 4.3 (update detection), Task 5.3

---

### Task 5.5: Implement git commit and tag logic
- After successful upload:
  - Commit all changes (mods, installation state, README)
    - `git add -A`
    - `git commit -m "Update modpack for Minecraft {version}"`
  - Create new tag using `create_tag()`
  - Push commit and tag using `push_tag()`
- Handle git conflicts gracefully

**Validation**: Tags are created and pushed correctly

**Dependencies**: Task 3.2 (tag operations), Task 5.4

---

### Task 5.6: Add error reporting and summary
- After processing all versions:
  - Log summary: total processed, uploaded, skipped, failed
  - If any errors occurred:
    - Log all error details
    - Exit with code 1
  - If all succeeded:
    - Exit with code 0

**Validation**: Script reports accurate summary

**Dependencies**: Task 5.2

---

### Task 5.7: Add auto-update script to package.json
- Edit `modpack_creator/package.json`
- Add `"auto-update": "bun src/auto_update.ts"` to scripts section

**Validation**: `bun run auto-update` executes the script

**Dependencies**: Task 5.1

---

## Phase 6: CI Integration

### Task 6.1: Create GitHub Actions workflow file
- Create `.github/workflows/auto-update-modpacks.yml`
- Set workflow name: "Auto Update Modpacks"
- Add triggers:
  - `schedule: cron: "0 1 * * *"` (daily at 1am UTC)
  - `workflow_dispatch:` (manual trigger)
- Set permissions: `contents: write`

**Validation**: Workflow file is valid YAML

**Dependencies**: None

---

### Task 6.2: Add checkout and setup steps
- Add step: Checkout repository
  - Use `actions/checkout@v4`
  - Set `fetch-depth: 0` (full history for tags)
- Add step: Setup Bun
  - Use `oven-sh/setup-bun@v1`
  - Set `bun-version: latest`
- Add step: Setup Go
  - Use `actions/setup-go@v5`
  - Set `go-version: 'stable'`
- Add step: Install packwiz
  - Run `go install github.com/packwiz/packwiz@latest`
  - Add `$HOME/go/bin` to PATH
- Add step: Install dependencies
  - Run `cd modpack_creator && bun install`

**Validation**: Workflow steps are syntactically correct

**Dependencies**: Task 6.1

---

### Task 6.3: Add git configuration step
- Add step: Configure git
  - Run `git config user.name "github-actions[bot]"`
  - Run `git config user.email "github-actions[bot]@users.noreply.github.com"`

**Validation**: Git is configured correctly in CI

**Dependencies**: Task 6.1

---

### Task 6.4: Add auto-update execution step
- Add step: Run auto-update
  - Set environment variables from secrets:
    - `MODRINTH_PAT_TOKEN`
    - `MODRINTH_PROJECT_ID`
    - `MODRINTH_CLIENT_ID`
    - `MODRINTH_CLIENT_SECRET`
  - Run `cd modpack_creator && bun run auto-update`

**Validation**: Step references correct secrets

**Dependencies**: Task 5.7 (package.json script)

---

### Task 6.5: Test workflow manually
- Commit workflow file to repository
- Trigger workflow manually via GitHub Actions UI
- Monitor execution logs
- Verify:
  - All dependencies install correctly
  - Script executes without errors
  - Versions are processed
  - Tags are created (if changes detected)
  - Uploads succeed (if changes detected)

**Validation**: Manual workflow run succeeds

**Dependencies**: All previous tasks

---

### Task 6.6: Enable daily schedule
- Verify workflow file has `schedule` trigger
- Confirm workflow is enabled in repository settings
- Monitor first scheduled run

**Validation**: Workflow runs automatically the next day

**Dependencies**: Task 6.5

---

## Phase 7: Documentation and Cleanup

### Task 7.1: Update README or docs
- Document the new auto-update system
- Explain how to trigger manual updates
- Explain how to disable auto-updates if needed
- Link to workflow file

**Validation**: Documentation is clear and accurate

**Dependencies**: Task 6.6 (workflow working)

**Parallelizable**: Can be done anytime after workflow is created

---

### Task 7.2: Deprecate old build script
- Add comment to `scripts/build_and_tag.sh` indicating it's deprecated
- Reference new auto-update system
- Keep file for emergency manual builds

**Validation**: Script has deprecation notice

**Dependencies**: Task 6.5 (new system working)

**Parallelizable**: Can be done anytime after auto-update is working

---

### Task 7.3: Final validation
- Run `bun run check_and_test` to ensure all tests pass
- Run `openspec validate automate-modpack-updates --strict`
- Verify no lint or type errors
- Verify all capabilities are implemented

**Validation**: All checks pass

**Dependencies**: All implementation tasks

---

## Summary

- **Total tasks**: 26
- **Phases**: 7
- **Estimated effort**: 2-3 days for full implementation
- **Key milestones**:
  1. Phase 1 complete: Fetch utility extracted and tested
  2. Phase 2 complete: Can discover Minecraft versions from API
  3. Phase 3 complete: Can manage git tags programmatically
  4. Phase 4 complete: Can detect when updates are needed
  5. Phase 5 complete: Can run full auto-update locally
  6. Phase 6 complete: CI workflow runs daily
  7. Phase 7 complete: Documentation updated, old script deprecated

**Parallelization opportunities**:
- Task 7.1 (docs) can start after Phase 6
- Task 7.2 (deprecation) can start after Phase 5
- Tests (tasks X.3, X.4) can be written in parallel with implementation
