import { $ } from "bun"
import { export_modpack } from "./export_modpack"
import { create_tag, find_latest_tag, increment_version, parse_tag, push_tag } from "./git_tag_manager"
import { install_packwiz_content } from "./install_mods"
import { get_safe_mod_list, mod_list } from "./mod_list"
import { resource_pack_list } from "./resource_pack_list"
import { needs_update } from "./update_detector"
import { update_readme } from "./update_readme"
import { upload_to_modrinth } from "./upload_to_modrinth"
import { get_current_minecraft_versions } from "./version_discovery"
import { save_installation_state } from "./write_mod_list"

interface VersionResult {
  mc_version: string
  status: "uploaded" | "skipped" | "error"
  error?: string
}

/**
 * Processes a single Minecraft version: builds modpack, checks for changes, uploads if needed.
 */
async function process_version(mc_version: string, index: number, total: number): Promise<VersionResult> {
  console.log(`\n${"=".repeat(80)}`)
  console.log(`[${index}/${total}] Processing Minecraft ${mc_version}`)
  console.log("=".repeat(80))

  try {
    // Set MC_VERSION environment variable for config
    process.env.MC_VERSION = mc_version

    // Force reload config with new MC_VERSION
    delete require.cache[require.resolve("./config")]
    const { config: current_config } = await import("./config")

    // Find latest tag or determine if this is the first build
    const latest_tag = await find_latest_tag(mc_version)
    const first_time = !latest_tag

    let new_modpack_version: string
    if (first_time) {
      new_modpack_version = "0.1.0"
      console.log("  ! No tag found - this is a new version")
    } else {
      const parsed = parse_tag(latest_tag)
      const old_version = parsed?.modpack_version ?? "0.1.0"
      new_modpack_version = increment_version(old_version)
      console.log(`  ✓ Found latest tag: ${latest_tag}`)
    }

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

    // Save installation state
    await save_installation_state(installation_result_full)

    // Update README
    await update_readme(installation_result_full)

    // Check if update is needed
    console.log("\n  Checking for changes...")
    const update_needed = await needs_update(mc_version, installation_result_full)

    if (!update_needed) {
      console.log("  ✓ No changes detected - skipping upload")
      return {
        mc_version,
        status: "skipped"
      }
    }

    console.log("  ✓ Changes detected - uploading to Modrinth")

    // Upload safe version
    console.log("\n  Uploading SAFE version...")
    const safe_upload_success = await upload_to_modrinth({
      file_path: safe_export,
      version_number: `${new_modpack_version}_${mc_version}_safe`,
      version_title: `Sodium Vanilla ${mc_version} (Safe) - v${new_modpack_version}`,
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
    console.log("\n  Uploading FULL version...")
    const full_upload_success = await upload_to_modrinth({
      file_path: full_export,
      version_number: `${new_modpack_version}_${mc_version}_full`,
      version_title: `Sodium Vanilla ${mc_version} (Full) - v${new_modpack_version}`,
      changelog: `Full version with all mods including possibly unsafe mods to use on servers for Minecraft ${mc_version}`,
      project_id: current_config.app.modrinth_project_id,
      game_versions: [mc_version],
      loaders: ["fabric"]
    })

    if (!full_upload_success) {
      throw new Error("Failed to upload full version to Modrinth")
    }
    console.log("  ✓ Uploaded full version")

    // Commit changes
    console.log("\n  Committing changes...")
    await $`git add -A`.quiet()
    const commit_message = `Update modpack for Minecraft ${mc_version}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
    await $`git commit -m ${commit_message}`.quiet()
    console.log("  ✓ Committed changes")

    // Create and push tag
    const new_tag = `${mc_version}_${new_modpack_version}`
    console.log(`\n  Creating tag: ${new_tag}`)
    await create_tag(new_tag, `Release modpack v${new_modpack_version} for Minecraft ${mc_version}`)
    console.log(`  ✓ Created tag: ${new_tag}`)

    console.log("\n  Pushing tag to remote...")
    await push_tag(new_tag)
    console.log(`  ✓ Pushed tag: ${new_tag}`)

    return {
      mc_version,
      status: "uploaded"
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${mc_version}:`, error)
    return {
      mc_version,
      status: "error",
      error: String(error)
    }
  }
}

async function main() {
  console.log("=".repeat(80))
  console.log("AUTOMATED MODPACK UPDATE SYSTEM")
  console.log("=".repeat(80))

  // Fetch current Minecraft versions
  console.log("\nFetching Minecraft versions from Modrinth API...")
  const versions = await get_current_minecraft_versions()
  console.log(`✓ Found ${versions.length} valid Minecraft versions (>= 1.14)`)

  // Process each version
  const results: VersionResult[] = []
  for (let i = 0; i < versions.length; i++) {
    const version = versions[i]
    if (!version) continue
    const result = await process_version(version, i + 1, versions.length)
    results.push(result)
  }

  // Summary report
  console.log(`\n${"=".repeat(80)}`)
  console.log("SUMMARY")
  console.log("=".repeat(80))

  const uploaded = results.filter((r) => r.status === "uploaded")
  const skipped = results.filter((r) => r.status === "skipped")
  const errors = results.filter((r) => r.status === "error")

  console.log(`Total versions processed: ${results.length}`)
  console.log(`✓ Uploaded: ${uploaded.length}`)
  console.log(`⏭  Skipped (no changes): ${skipped.length}`)
  console.log(`❌ Errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log("\nERRORS:")
    for (const error of errors) {
      console.log(`  ${error.mc_version}: ${error.error}`)
    }
    process.exit(1)
  }

  console.log("\n✅ All versions processed successfully!")
  process.exit(0)
}

main()
