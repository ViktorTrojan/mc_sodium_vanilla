# Design: Automate Modpack Updates

## Architecture Overview

The automated update system follows a modular pipeline architecture consistent with the existing codebase. The system is composed of independent utilities that can be tested in isolation and orchestrated by a main script.

```
┌─────────────────────────────────────────────────────────────┐
│                   Daily CI Trigger (1am UTC)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              auto-update script (TypeScript)                │
│                                                              │
│  1. Fetch Minecraft versions from Modrinth API              │
│  2. Filter versions (>= 1.14, release only)                 │
│  3. For each version:                                       │
│     a. Check if git tag exists                              │
│     b. If exists: compare mod_installation_state.json       │
│     c. If changed OR new: build modpack                     │
│     d. Upload to Modrinth (safe + full variants)            │
│     e. Create/increment git tag                             │
│     f. Push tag to remote                                   │
└─────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. Fetch Utility (`src/utils/fetch_with_retry.ts`)

**Purpose**: Centralized HTTP fetch with retry logic and rate limit handling

**Responsibilities**:
- Perform HTTP requests with exponential backoff
- Handle 429 rate limit responses
- Configurable retry count and initial delay
- Used by all API interactions (Modrinth version discovery, mod metadata, etc.)

**Design Decision**: Extract from `write_mod_list.ts` to avoid duplication and ensure consistent retry behavior across the codebase.

### 2. Version Discovery (`src/version_discovery.ts`)

**Purpose**: Fetch and filter Minecraft versions from Modrinth API

**Responsibilities**:
- Call `https://api.modrinth.com/v2/tag/game_version`
- Filter for `version_type === "release"`
- Filter for versions >= 1.14 using semver comparison
- Return sorted list of valid versions

**API Response Schema**:
```typescript
interface GameVersion {
  version: string           // e.g., "1.21.10"
  version_type: string      // "release" or "snapshot"
  date: string             // ISO 8601 timestamp
  major: boolean           // true for major releases
}
```

**Filtering Logic**:
1. Parse version string (e.g., "1.21.10" -> [1, 21, 10])
2. Compare major version (must be >= 1)
3. If major === 1, compare minor (must be >= 14)
4. Reject versions that don't match pattern (e.g., "25w41a", "b1.16.6")

**Test Coverage**: Include tests for edge cases (1.13.3, 1.14, 1.14.1, 2.0.0, snapshots)

### 3. Git Tag Management (`src/git_tag_manager.ts`)

**Purpose**: Query, parse, and manage version tags

**Responsibilities**:
- List all tags matching pattern `{MC_VERSION}_{MODPACK_VERSION}`
- Parse tags to extract MC version and modpack version
- Find the latest tag for a given MC version
- Increment modpack version (e.g., `0.1.0` -> `0.1.1`)
- Create and push new tags

**Tag Format**: `{MC_VERSION}_{MODPACK_VERSION}`
- Examples: `1.14_0.1.0`, `1.21.10_0.1.1`
- MC_VERSION: Minecraft version (e.g., "1.21.10")
- MODPACK_VERSION: Semantic version (e.g., "0.1.0")

**Git Operations** (using `Bun.$`):
```typescript
// List tags for a specific MC version
await $`git tag -l "${mc_version}_*"`.text()

// Checkout tag to access files
await $`git checkout ${tag_name}`.quiet()

// Create new tag
await $`git tag -a ${tag_name} -m ${message}`.quiet()

// Push tag
await $`git push origin ${tag_name}`.quiet()
```

**Version Increment Logic**:
- Parse `0.1.0` into [0, 1, 0]
- Increment patch version: [0, 1, 1]
- Join back: `0.1.1`
- For new versions: start at `0.1.0`

### 4. Update Detection (`src/update_detector.ts`)

**Purpose**: Determine if a modpack needs to be rebuilt and uploaded

**Responsibilities**:
- Load `mod_installation_state.json` from a git tag
- Compare with newly built installation state
- Return boolean indicating if changes were detected

**Comparison Logic**:
Deep comparison of `ModInstallationState` objects:
- Compare `successful` arrays (identifier + category)
- Compare `failed` arrays (identifier + category)
- Compare `alternative_installed` arrays (identifier + category)
- Return `true` if any differences found

**Edge Cases**:
- **New version** (no tag exists): Return `true` (always upload)
- **No state file on tag**: Return `true` (assume changed)
- **Parse error**: Log warning, return `true` (safe default)

### 5. Automated Build Pipeline (`src/auto_update.ts`)

**Purpose**: Main orchestration script that processes all Minecraft versions

**Workflow** (per version):
```typescript
1. Get latest tag for MC version (if exists)
   - If no tag: first_time = true, modpack_version = "0.1.0"
   - If tag exists: first_time = false, load old state

2. Set MC_VERSION environment variable
   process.env.MC_VERSION = mc_version

3. Build modpack (both variants)
   - Run same logic as current index.ts
   - Install mods, export .mrpack, save installation state

4. Compare states (if not first_time)
   - Load old state from tag
   - Compare with new state
   - If identical: skip upload, continue to next version

5. Upload to Modrinth (if changed or first_time)
   - Upload safe variant
   - Upload full variant
   - Use existing upload_to_modrinth function

6. Create/increment git tag
   - Calculate new tag name
   - Commit changes (mod files, installation state, README)
   - Create annotated tag
   - Push commit and tag to origin

7. Reset to main branch
   - Ensure clean state for next iteration
```

**Error Handling**:
- If one version fails, log error and continue to next version
- Collect all errors and report at the end
- Exit with non-zero code if any version failed

**Progress Logging**:
```
Processing Minecraft versions: 1.14, 1.14.1, ..., 1.21.10
[1/38] Minecraft 1.14
  ✓ Found tag: 1.14_0.1.0
  ✓ Built modpack
  ✓ Compared states: NO CHANGES
  ⏭  Skipping upload
[2/38] Minecraft 1.14.1
  ! No tag found (new version)
  ✓ Built modpack
  ✓ Uploaded to Modrinth
  ✓ Created tag: 1.14.1_0.1.0
...
```

### 6. CI Integration (`.github/workflows/auto-update-modpacks.yml`)

**Trigger**: Daily schedule (cron: `0 1 * * *` = 1am UTC)

**Workflow Steps**:
1. Checkout repository with full history (`fetch-depth: 0` for tag access)
2. Setup Bun, Go, and packwiz
3. Install dependencies
4. Run `bun run auto-update` script
5. Errors will fail the workflow (email notification to maintainers)

**Environment Variables**:
- `MODRINTH_PAT_TOKEN`: API authentication
- `MODRINTH_PROJECT_ID`: Target project
- `MODRINTH_CLIENT_ID` / `MODRINTH_CLIENT_SECRET`: OAuth credentials

**Git Configuration**:
```yaml
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
```

## Data Flow

### Input Sources
1. **Modrinth API**: Current Minecraft versions
2. **Git tags**: Historical modpack versions and installation states
3. **Mod definitions**: `mod_list.ts` (unchanged)
4. **Configuration**: Environment variables (MC_VERSION, tokens)

### Output Artifacts
1. **Modrinth uploads**: `.mrpack` files for safe and full variants
2. **Git tags**: Version markers (e.g., `1.21.10_0.1.1`)
3. **Git commits**: Updated mod files and installation states
4. **Logs**: CI workflow logs for debugging

### State Management
- **Current state**: `mod_installation_state.json` at repo root (reflects latest build)
- **Historical state**: `mod_installation_state.json` in each git tag (reflects that version)
- **Comparison**: Checkout tag, read file, compare with current

## Technology Choices

### Why TypeScript over Bash?
- **Type safety**: Catch errors at compile time
- **Testability**: Easier to write unit tests
- **Maintainability**: Better IDE support, refactoring tools
- **Consistency**: Aligns with existing codebase

### Why Bun?
- **Already used**: Consistent with existing tooling
- **Fast**: Faster than Node.js for scripting
- **Shell support**: `Bun.$` provides easy shell command execution
- **File I/O**: `Bun.file()` and `Bun.write()` are simpler than Node.js APIs

### Why Daily Schedule?
- **Balance**: Frequent enough to catch updates, infrequent enough to avoid waste
- **Off-peak**: 1am UTC is typically low-traffic
- **Predictable**: Easier to debug if issues occur

## Testing Strategy

### Unit Tests
1. **fetch_with_retry**: Mock fetch, test retry logic and backoff
2. **version_discovery**: Mock API response, test filtering logic
3. **git_tag_manager**: Mock git commands, test parsing and increment logic
4. **update_detector**: Test deep comparison with various state differences

### Integration Tests
1. **End-to-end**: Run auto-update script on a test repository
2. **API validation**: Real API call to verify response schema
3. **Git operations**: Test tag creation and checkout in isolated repo

### Test File Organization
- `src/utils/fetch_with_retry.test.ts`
- `src/version_discovery.test.ts`
- `src/git_tag_manager.test.ts`
- `src/update_detector.test.ts`

## Migration Plan

### Phase 1: Extract and Test Utilities
1. Create `src/utils/fetch_with_retry.ts`
2. Update `write_mod_list.ts` to import from new location
3. Add tests for `fetch_with_retry`

### Phase 2: Implement Core Modules
1. Implement `version_discovery.ts` with tests
2. Implement `git_tag_manager.ts` with tests
3. Implement `update_detector.ts` with tests

### Phase 3: Build Orchestration
1. Implement `auto_update.ts` main script
2. Add `auto-update` script to `package.json`
3. Test locally with a subset of versions

### Phase 4: CI Integration
1. Create `.github/workflows/auto-update-modpacks.yml`
2. Test with manual workflow dispatch
3. Enable daily schedule
4. Monitor first few runs

### Phase 5: Cleanup
1. Mark `scripts/build_and_tag.sh` as deprecated (add comment)
2. Update documentation to reference new workflow
3. Remove manual workflow dispatch from CI (optional)

## Rollback Plan

If issues arise:
1. Disable the daily CI workflow (comment out `schedule` trigger)
2. Revert to manual `scripts/build_and_tag.sh` usage
3. Fix issues in TypeScript implementation
4. Re-enable CI workflow

## Performance Considerations

### API Rate Limits
- Modrinth API has rate limits (unclear from docs, but common)
- Use `fetch_with_retry` with exponential backoff
- Process versions serially to avoid parallel request spikes

### CI Runtime
- Estimated time: ~5 minutes per version (build + upload)
- 38 versions × 5 minutes = ~3 hours (worst case)
- Optimize by skipping unchanged versions (most runs will be fast)

### Git Repository Size
- Each tag adds minimal overhead (just a pointer)
- `mod_installation_state.json` is small (~10KB)
- No concerns about repo bloat

## Open Questions

1. **What if Modrinth API is down?**
   - Current answer: Fail the workflow, retry next day
   - Alternative: Add fallback to hardcoded version list

2. **Should we limit to recent versions only?**
   - Current answer: Process all versions >= 1.14
   - Alternative: Only process versions from last 2 years

3. **How to handle version hotfixes?**
   - Current answer: Tag increment handles it (0.1.0 -> 0.1.1)
   - Alternative: Add manual override to force rebuild specific version
