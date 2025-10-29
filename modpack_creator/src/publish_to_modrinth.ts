import { $ } from "bun"
import { config } from "./config"
import { export_modpack } from "./export_modpack"
import { checkout_branch, checkout_tag, find_latest_tag, get_tag_commit_hash, parse_tag } from "./git_tag_manager"
import { install_packwiz_content } from "./install_mods"
import { get_safe_mod_list, mod_list } from "./mod_list"
import { resource_pack_list } from "./resource_pack_list"
import { upload_to_modrinth } from "./upload_to_modrinth"
import { get_current_minecraft_versions } from "./version_discovery"

interface PublishResult {
  mc_version: string
  status: "published" | "skipped" | "error"
  reason?: string
  error?: string
}

/**
 * Checks if two tags point to the same commit.
 */
async function tags_have_same_commit(tag1: string, tag2: string): Promise<boolean> {
  try {
    const hash1 = await get_tag_commit_hash(tag1)
    const hash2 = await get_tag_commit_hash(tag2)
    return hash1 === hash2
  } catch (error) {
    console.error(`Error comparing tag commits: ${error}`)
    return false
  }
}

/**
 * Publishes a single Minecraft version to Modrinth.
 * Only publishes if the latest tag differs from the previous tag (has changes).
 */
async function publish_version(mc_version: string, index: number, total: number): Promise<PublishResult> {
  console.log(`\n${"=".repeat(80)}`)
  console.log(`[${index}/${total}] Publishing Minecraft ${mc_version}`)
  console.log("=".repeat(80))

  try {
    // Find latest tag
    const latest_tag = await find_latest_tag(mc_version)

    if (!latest_tag) {
      console.log("  ⏭  No tag found - skipping")
      return {
        mc_version,
        status: "skipped",
        reason: "No tag found"
      }
    }

    console.log(`  ✓ Found latest tag: ${latest_tag}`)

    // Parse to get the modpack version
    const parsed = parse_tag(latest_tag)
    if (!parsed) {
      console.log("  ⏭  Could not parse tag - skipping")
      return {
        mc_version,
        status: "skipped",
        reason: "Could not parse tag"
      }
    }

    const modpack_version = parsed.modpack_version

    // Check if there's a previous version
    const version_parts = modpack_version.split(".").map(Number)
    const patch = version_parts[2] ?? 0

    if (patch === 0) {
      // This is the first version (x.x.0), always publish
      console.log("  ✓ First version - will publish")
    } else {
      // Check if previous version exists
      const previous_version = `${version_parts[0]}.${version_parts[1]}.${patch - 1}`
      const previous_tag = `${mc_version}_${previous_version}`

      // Check if previous tag exists
      const tags_list = await $`git tag -l ${previous_tag}`.text()
      if (!tags_list.trim()) {
        console.log(`  ✓ No previous tag found (${previous_tag}) - will publish`)
      } else {
        // Compare commits
        const same_commit = await tags_have_same_commit(latest_tag, previous_tag)

        if (same_commit) {
          console.log(`  ⏭  No changes from previous version (${previous_tag}) - skipping`)
          return {
            mc_version,
            status: "skipped",
            reason: `No changes from ${previous_tag}`
          }
        }

        console.log(`  ✓ Changes detected from ${previous_tag} - will publish`)
      }
    }

    // Checkout the tag
    console.log(`\n  Checking out tag ${latest_tag}...`)
    await checkout_tag(latest_tag)

    // Set MC_VERSION environment variable for config
    process.env.MC_VERSION = mc_version
    config.app.mc_version = mc_version

    // Force reload config with new MC_VERSION
    delete require.cache[require.resolve("./config")]
    const { config: current_config } = await import("./config")

    // Build safe version
    console.log("\n  Building SAFE version...")
    const safe_mod_list = get_safe_mod_list()
    const installation_result_safe = install_packwiz_content(safe_mod_list, resource_pack_list)

    if (installation_result_safe.failed.length > 0) {
      console.log(`  ⚠  ${installation_result_safe.failed.length} mod(s) failed in safe version`)
    } else {
      console.log("  ✓ All mods installed successfully for safe version")
    }

    const safe_export = export_modpack("safe")
    if (!safe_export) {
      throw new Error("Failed to export safe version")
    }
    console.log(`  ✓ Exported safe version: ${safe_export}`)

    // Build full version
    console.log("\n  Building FULL version...")
    const installation_result_full = install_packwiz_content(mod_list, resource_pack_list)

    if (installation_result_full.failed.length > 0) {
      console.log(`  ⚠  ${installation_result_full.failed.length} mod(s) failed in full version`)
    } else {
      console.log("  ✓ All mods installed successfully for full version")
    }

    const full_export = export_modpack("full")
    if (!full_export) {
      throw new Error("Failed to export full version")
    }
    console.log(`  ✓ Exported full version: ${full_export}`)

    // Upload safe version
    console.log("\n  Uploading SAFE version to Modrinth...")
    const safe_upload_success = await upload_to_modrinth({
      file_path: safe_export,
      version_number: `${modpack_version}_${mc_version}_safe`,
      version_title: `Sodium Vanilla ${mc_version} (Safe) - v${modpack_version}`,
      changelog: `Safe to use version for servers for Minecraft ${mc_version}`,
      project_id: current_config.app.modrinth_project_id,
      game_versions: [mc_version],
      loaders: ["fabric"]
    })

    if (!safe_upload_success) {
      throw new Error("Failed to upload safe version to Modrinth")
    }
    console.log("  ✓ Uploaded safe version")

    // Upload full version
    console.log("\n  Uploading FULL version to Modrinth...")
    const full_upload_success = await upload_to_modrinth({
      file_path: full_export,
      version_number: `${modpack_version}_${mc_version}_full`,
      version_title: `Sodium Vanilla ${mc_version} (Full) - v${modpack_version}`,
      changelog: `Full version with all mods including possibly unsafe mods to use on servers for Minecraft ${mc_version}`,
      project_id: current_config.app.modrinth_project_id,
      game_versions: [mc_version],
      loaders: ["fabric"]
    })

    if (!full_upload_success) {
      throw new Error("Failed to upload full version to Modrinth")
    }
    console.log("  ✓ Uploaded full version")

    // Return to main branch
    console.log("\n  Returning to main branch...")
    await checkout_branch("main")

    return {
      mc_version,
      status: "published"
    }
  } catch (error) {
    console.error(`  ❌ Error publishing ${mc_version}:`, error)

    // Try to return to main branch
    try {
      await checkout_branch("main")
    } catch (checkout_error) {
      console.error("  ⚠  Failed to return to main branch:", checkout_error)
    }

    return {
      mc_version,
      status: "error",
      error: String(error)
    }
  }
}

/**
 * Phase 2: Publish changed versions to Modrinth.
 *
 * Compares the latest tag with the previous tag for each Minecraft version.
 * Only publishes versions where the tags point to different commits (have changes).
 */
async function main() {
  console.log("=".repeat(80))
  console.log("PHASE 2: PUBLISH TO MODRINTH")
  console.log("=".repeat(80))
  console.log()

  // Fetch current Minecraft versions
  console.log("Fetching Minecraft versions from Modrinth API...")
  const versions = await get_current_minecraft_versions()
  console.log(`✓ Found ${versions.length} valid Minecraft versions (>= 1.14)`)

  // Publish each version
  const results: PublishResult[] = []
  for (let i = 0; i < versions.length; i++) {
    const version = versions[i]
    if (!version) continue
    const result = await publish_version(version, i + 1, versions.length)
    results.push(result)
  }

  // Summary report
  console.log(`\n${"=".repeat(80)}`)
  console.log("SUMMARY")
  console.log("=".repeat(80))

  const published = results.filter((r) => r.status === "published")
  const skipped = results.filter((r) => r.status === "skipped")
  const errors = results.filter((r) => r.status === "error")

  console.log(`Total versions processed: ${results.length}`)
  console.log(`✓ Published: ${published.length}`)
  console.log(`⏭  Skipped: ${skipped.length}`)
  console.log(`❌ Errors: ${errors.length}`)

  if (published.length > 0) {
    console.log("\nPublished versions:")
    for (const result of published) {
      console.log(`  - ${result.mc_version}`)
    }
  }

  if (skipped.length > 0) {
    console.log("\nSkipped versions:")
    for (const result of skipped) {
      console.log(`  - ${result.mc_version}: ${result.reason}`)
    }
  }

  if (errors.length > 0) {
    console.log("\nERRORS:")
    for (const error of errors) {
      console.log(`  ${error.mc_version}: ${error.error}`)
    }
    process.exit(1)
  }

  console.log("\n✅ Phase 2 complete! All changed versions published to Modrinth.")
  process.exit(0)
}

main()
