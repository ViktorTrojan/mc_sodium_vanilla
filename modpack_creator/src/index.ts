import { config } from "./config"
import { export_modpack } from "./export_modpack"
import { install_packwiz_content } from "./install_mods"
import { get_safe_mod_list, mod_list } from "./mod_list"
import { resource_pack_list } from "./resource_pack_list"
import { update_readme } from "./update_readme"
import { upload_to_modrinth } from "./upload_to_modrinth"
import { save_installation_state } from "./write_mod_list"

// Parse command line arguments
const args = process.argv.slice(2)
const buildFull = args.includes("--full") || (!args.includes("--safe") && !args.includes("--full"))
const buildSafe = args.includes("--safe") || (!args.includes("--safe") && !args.includes("--full"))
const skipUpload = args.includes("--no-upload")

async function main() {
  let installation_result_full: ReturnType<typeof install_packwiz_content> | null = null

  if (buildSafe) {
    // Now install safe version (no cheating mods)
    console.log(`\n${"=".repeat(60)}`)
    console.log("Installing SAFE mod list (no cheating)...")
    console.log(`${"=".repeat(60)}\n`)

    const safe_mod_list = get_safe_mod_list()
    const installation_result_safe = install_packwiz_content(safe_mod_list, resource_pack_list)

    if (installation_result_safe.failed.length > 0) {
      console.log(`\n❌ ${installation_result_safe.failed.length} mod(s) failed to install in safe version`)
    } else {
      console.log("\n✅ All mods installed successfully for safe version!")
    }

    // Export safe version
    const safe_export = export_modpack("safe")
    if (!safe_export) {
      console.error("❌ Failed to export safe version")
      process.exit(1)
    }

    if (!skipUpload) {
      // Upload safe version to Modrinth
      const safe_upload_success = await upload_to_modrinth({
        file_path: safe_export,
        version_number: `${config.app.mc_version}_safe`,
        version_title: `Sodium Vanilla ${config.app.mc_version} (Safe)`,
        changelog: `Safe to use version for servers for Minecraft ${config.app.mc_version}`,
        project_id: config.app.modrinth_project_id,
        game_versions: [config.app.mc_version],
        loaders: ["fabric"]
      })

      if (!safe_upload_success) {
        console.error("❌ Failed to upload safe version to Modrinth")
        process.exit(1)
      }
    } else {
      console.log("\n⏭️  Skipping upload to Modrinth for safe version")
    }
  }

  if (buildFull) {
    // Install full mod list (cheating version)
    console.log("=".repeat(60))
    console.log("Installing FULL mod list (cheating version)...")
    console.log(`${"=".repeat(60)}\n`)

    installation_result_full = install_packwiz_content(mod_list, resource_pack_list)

    if (installation_result_full.failed.length > 0) {
      console.log(`\n❌ ${installation_result_full.failed.length} mod(s) failed to install in full version`)
    } else {
      console.log("\n✅ All mods installed successfully for full version!")
    }

    // Export full version
    const full_export = export_modpack("full")
    if (!full_export) {
      console.error("❌ Failed to export full version")
      process.exit(1)
    }

    if (!skipUpload) {
      // Upload full version to Modrinth
      const full_upload_success = await upload_to_modrinth({
        file_path: full_export,
        version_number: `${config.app.mc_version}_full`,
        version_title: `Sodium Vanilla ${config.app.mc_version} (Full)`,
        changelog: `Full version with all mods including possibly unsafe mods to use on servers for Minecraft ${config.app.mc_version}`,
        project_id: config.app.modrinth_project_id,
        game_versions: [config.app.mc_version],
        loaders: ["fabric"]
      })

      if (!full_upload_success) {
        console.error("❌ Failed to upload full version to Modrinth")
        process.exit(1)
      }
    } else {
      console.log("\n⏭️  Skipping upload to Modrinth for full version")
    }
  }

  // Update README with full mod list (only if full version was built)
  if (installation_result_full) {
    console.log(`\n${"=".repeat(60)}`)
    console.log("Updating README.md...")
    console.log(`${"=".repeat(60)}\n`)

    // Save installation state JSON
    console.log("\nSaving mod installation state JSON...\n")
    await save_installation_state(installation_result_full)

    console.log("\nUpdating README.md with mod list...\n")
    await update_readme(installation_result_full)
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log("✅ ALL DONE!")
  console.log("=".repeat(60))
}

main()
