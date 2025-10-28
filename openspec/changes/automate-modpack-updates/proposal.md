# Proposal: Automate Modpack Updates

**Change ID:** `automate-modpack-updates`
**Status:** Proposed
**Author:** User
**Date:** 2025-10-28

## Why

The current manual bash-based build process (`scripts/build_and_tag.sh`) requires manual execution, hardcodes Minecraft versions, lacks change detection, and is difficult to maintain as complexity grows. Automating this process in TypeScript will enable daily CI runs that discover new Minecraft versions, build only when changes are detected, and maintain the project with minimal human intervention.

## What Changes

- Extract `fetch_with_retry` function from `write_mod_list.ts` into reusable utility module
- Implement Minecraft version discovery by fetching from Modrinth API (instead of hardcoding)
- Implement git tag management utilities (list, parse, create, increment versions)
- Implement mod installation state comparison to detect when updates are needed
- Create automated build pipeline script (`auto_update.ts`) that orchestrates the full workflow
- Add `auto-update` npm script to `package.json`
- Create daily GitHub Actions workflow (`.github/workflows/auto-update-modpacks.yml`)
- Deprecate `scripts/build_and_tag.sh` (keep for emergency manual use)

## Impact

- **Affected specs**: None (this is the first spec for automated updates)
- **Affected code**:
  - `modpack_creator/src/write_mod_list.ts` (extract fetch utility)
  - `modpack_creator/package.json` (add new script)
  - New files: `src/utils/fetch_with_retry.ts`, `src/version_discovery.ts`, `src/git_tag_manager.ts`, `src/update_detector.ts`, `src/auto_update.ts`
  - New workflow: `.github/workflows/auto-update-modpacks.yml`
- **Benefits**: Reduces manual work, keeps modpacks automatically up-to-date, improves maintainability
- **Risks**: CI runtime limits (mitigated by skipping unchanged versions), API rate limits (mitigated by retry logic)
