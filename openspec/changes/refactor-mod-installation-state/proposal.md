# Refactor Mod Installation State Tracking

**Change ID:** `refactor-mod-installation-state`
**Status:** Proposal
**Created:** 2025-10-28

## Summary

Refactor the mod installation state tracking system to replace the current `missing_mod_list.json` with a comprehensive `mod_installation_state.json` file that tracks both successfully installed and failed-to-install mods. Add TypeScript functions to read and parse this state file for programmatic access.

## Motivation

The current `missing_mod_list.json` file has several limitations:

1. **Misleading name:** Despite its name, it tracks both missing mods AND mods with installed alternatives, making the filename confusing
2. **Incomplete data:** Only tracks problematic installations (failures + alternatives), but not successful installations
3. **No programmatic access:** No dedicated function exists to load this data back into TypeScript for analysis or reporting
4. **Limited use cases:** Cannot answer questions like "what mods were successfully installed?" or "what's the full installation state?"

This refactoring will create a unified installation state system that:
- Tracks ALL mod installations (success, failure, alternatives)
- Uses a clear, descriptive filename
- Provides type-safe TypeScript access functions
- Leverages Bun's native file I/O APIs for performance

## Impact

### Changed Components
- [modpack_creator/src/write_mod_list.ts](modpack_creator/src/write_mod_list.ts) - Refactor `save_missing_mod_list_json()` function
- [modpack_creator/src/types.ts](modpack_creator/src/types.ts) - Update/add types for installation state
- [modpack_creator/src/index.ts](modpack_creator/src/index.ts) - Update function calls to use new naming

### New Components
- New module for reading installation state (e.g., `read_installation_state.ts`)
- New JSON file: `mod_installation_state.json` (replaces `missing_mod_list.json`)

### Breaking Changes
- `missing_mod_list.json` will be replaced with `mod_installation_state.json`
- Existing code or scripts that read `missing_mod_list.json` will need updates
- The JSON structure will change to include successful installations

## Alternatives Considered

1. **Keep both files:** Maintain `missing_mod_list.json` for failures and create `successful_mods.json` for successes
   - Rejected: Creates data duplication and requires reading multiple files

2. **Use SQLite database:** Store installation state in a local database
   - Rejected: Overkill for this use case; JSON is sufficient and more portable

3. **Only add read function without refactoring:** Keep current filename and structure
   - Rejected: Doesn't address the confusing naming and incomplete data issues

## Open Questions

1. Should we maintain backward compatibility by keeping `missing_mod_list.json` temporarily?
   - Recommendation: No, clean break is better. The project appears to be in active development without external consumers of this file.

2. Should the read function validate the JSON schema or trust the data?
   - Recommendation: Basic validation (check required fields exist) for robustness.

## Related Changes

None - This is a standalone refactoring change.

## Spec Deltas

- `specs/mod-installation-state` - NEW capability for comprehensive mod installation state tracking
