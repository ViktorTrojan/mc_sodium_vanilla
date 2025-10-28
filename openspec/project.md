# Project Context

## Purpose
Sodium Vanilla is an automated Minecraft client-side modpack builder that provides performance and quality-of-life improvements through curated optimization mods. The project automatically builds and publishes modpack updates for the latest Minecraft versions.

**Key Goals:**
- Maintain two variants per Minecraft release: `_safe` (server-friendly) and `_full` (includes cheating mods like x-ray, minimap)
- No preset configurations to ensure safe updates without losing user settings
- Curate 80+ mods across 4 categories: optimization, visual enhancements, useful utilities, and cheating tools
- Automate distribution via Modrinth platform for Fabric modloader users
- Support multiple Minecraft versions (currently 1.14 through 1.21.10)

## Tech Stack
- **Runtime:** Bun (JavaScript/TypeScript runtime, faster than Node.js)
- **Language:** TypeScript (strict mode, ESNext target)
- **Package Manager:** Bun (npm compatible with bun.lock)
- **Modpack Format:** PackWiz (pack.toml v1.1.0)
- **Modloader:** Fabric (currently v0.17.3 targeting MC 1.21.10)
- **Distribution:** Modrinth API for mod downloads and version publishing
- **Code Quality:** Biome v2.3.1 (formatter + linter, replaces ESLint/Prettier)
- **Version Management:** Changesets CLI for semantic versioning
- **Containerization:** Docker + Docker Compose for development environment
- **CI/CD:** GitHub Actions for automated releases

## Project Conventions

### Code Style
**Enforced by Biome** (`modpack_creator/biome.json`):
- 2-space indentation
- Line width: 300 characters (optimized for modpack data structures)
- LF line endings
- No trailing commas in JSON
- Linter rules include:
  - `noForEach` - prefer for/of loops for better performance
  - `noNonNullAssertion` - strict null handling required
  - `useNodejsImportProtocol` - always use `node:` prefix for Node.js imports
  - `useExhaustiveDependencies` - enforce complete dependency arrays

**Naming Conventions:**
- File names: snake_case (e.g., `mod_list.ts`, `upload_to_modrinth.ts`)
- Variables/functions: camelCase
- Types/interfaces: PascalCase
- Constants: SCREAMING_SNAKE_CASE for environment variables

### Architecture Patterns
**Modular Pipeline Architecture:**
- Entry point (`index.ts`) orchestrates the build pipeline
- Separate modules for distinct responsibilities:
  - `config.ts` - Environment variable validation
  - `mod_list.ts` - Mod definitions and categorization
  - `install_mods.ts` - PackWiz integration
  - `export_modpack.ts` - .mrpack file generation
  - `upload_to_modrinth.ts` - API client for publishing
  - `update_readme.ts` - Documentation generation

**Data Flow:**
1. Load config and mod definitions
2. Install mods via PackWiz CLI
3. Generate two variants (safe/full) by filtering mod lists
4. Export to .mrpack format
5. Upload to Modrinth with metadata
6. Update README with installed mods

**Separation of Concerns:**
- Core application in `modpack_creator/` directory
- Mod definitions in `mods/` as PackWiz .pw.toml files
- Build scripts in `scripts/` directory
- CI/CD in `.github/workflows/`

### Testing Strategy
- **Framework:** Bun's native test runner
- **Commands:**
  - `bun test` - Run unit tests
  - `bun test --coverage` - Generate coverage reports
  - `bun run check_and_test` - Full QA (lint + type check + tests)

**Quality Gates:**
- TypeScript strict mode compilation must pass
- Biome linter must show no errors
- All tests must pass before deployment

**Testing Infrastructure Present but Tests May Be Minimal** - Focus on integration testing through CI/CD pipeline

### Git Workflow
**Branching Strategy:**
- `main` - Primary development and release branch
- Feature branches for OpenSpec changes (see AGENTS.md)

**Commit Conventions:**
- Automated commits via GitHub Actions use `git-actions[bot]` identity
- Manual commits should be descriptive and reference issues/specs when applicable
- Build script generates automated commits per Minecraft version

**Release Process:**
1. Update `VERSION` file with semantic version
2. Run batch build script for multiple MC versions
3. Script automatically: installs deps → builds → commits → tags → pushes
4. GitHub Actions workflow triggers for Modrinth upload
5. Tags follow format: `{MC_VERSION}_{MODPACK_VERSION}` (e.g., `1.21.10_0.1.0`)

**Important:** Never force-push to main unless running the official release workflow

## Domain Context
**Minecraft Modding Ecosystem:**
- **Fabric** - Lightweight modloader for Minecraft, preferred over Forge for performance
- **PackWiz** - CLI tool for managing Minecraft modpacks with version control
- **Modrinth** - Modern mod hosting platform with API for automated publishing
- **.mrpack** - Modrinth modpack format (ZIP archive with manifest)
- **.pw.toml** - PackWiz mod definition files with project IDs and hashes

**Mod Categories:**
1. **Optimization** - Performance mods (Sodium, Lithium, etc.)
2. **Visual** - Graphics enhancements (shaders, resource packs)
3. **Useful** - Quality-of-life improvements (minimaps, inventory tweaks)
4. **Cheating** - Mods that give unfair advantages (x-ray, fly hacks) - only in `_full` variant

**Version Targeting:**
- Modpack versions are independent of Minecraft versions
- Each Minecraft version gets its own build with compatible mod versions
- PackWiz automatically resolves compatible mod versions for target MC version

## Important Constraints
**Technical Constraints:**
- Must use Fabric modloader (no Forge support)
- Mods must be available on Modrinth with proper API access
- PackWiz requires Go runtime for installation
- Environment variables (MODRINTH_PAT_TOKEN, etc.) required for uploads
- SHA256 hashing required for mod integrity verification

**Business Constraints:**
- Two variants required per release (safe/full) to serve different audiences
- No preset configurations allowed (users must configure mods themselves)
- Must maintain compatibility across 26+ Minecraft versions
- Automated builds must complete successfully for all target versions

**Safety Constraints:**
- Safe variant must exclude all mods that could be considered cheating
- Server-side mod detection must be respected (safe variant only)
- User data/configs must never be overwritten by updates

## External Dependencies
**Required Services:**
- **Modrinth API** - Mod downloads, version resolution, modpack publishing
  - Requires OAuth client credentials and personal access token
  - Rate limits apply to API requests
  - Project ID must be pre-configured

**Required Tools:**
- **PackWiz** - Go-based CLI for mod management (installed via `go install`)
- **Bun** - Runtime and package manager (v1.0+)
- **Go** - Required for PackWiz compilation (v1.23.2+)

**Development Tools:**
- **Docker** - Optional containerized dev environment
- **GitHub Actions** - CI/CD automation (Ubuntu latest runners)
- **Biome** - Code quality tooling (v2.3.1)

**Key External Files:**
- `pack.toml` - PackWiz metadata (MC version, Fabric loader version)
- `index.toml` - Auto-generated mod index with hashes
- `mods/*.pw.toml` - Per-mod configuration files (100+ files)
- `missing_mod_list.json` - Fallback tracking for failed installs
