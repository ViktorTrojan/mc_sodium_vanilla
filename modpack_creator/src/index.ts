import { config } from "./config"
import { export_modpack } from "./export_modpack"
import { install_mods_with_packwiz } from "./install_mods"
import { get_safe_mod_list, mod_list } from "./mod_list"
import { update_readme } from "./update_readme"
import { upload_to_modrinth } from "./upload_to_modrinth"

async function main() {
  // Install full mod list (cheating version)
  console.log("=".repeat(60))
  console.log("Installing FULL mod list (cheating version)...")
  console.log("=".repeat(60) + "\n")

  const failed_mods_full = install_mods_with_packwiz(mod_list)

  if (failed_mods_full.length > 0) {
    console.log(`\n❌ ${failed_mods_full.length} mod(s) failed to install in full version`)
  } else {
    console.log("\n✅ All mods installed successfully for full version!")
  }

  // Export full version
  const full_export = export_modpack()
  if (!full_export) {
    console.error("❌ Failed to export full version")
    process.exit(1)
  }

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

  // Now install safe version (no cheating mods)
  console.log("\n" + "=".repeat(60))
  console.log("Installing SAFE mod list (no cheating)...")
  console.log("=".repeat(60) + "\n")

  const safe_mod_list = get_safe_mod_list()
  const failed_mods_safe = install_mods_with_packwiz(safe_mod_list)

  if (failed_mods_safe.length > 0) {
    console.log(`\n❌ ${failed_mods_safe.length} mod(s) failed to install in safe version`)
  } else {
    console.log("\n✅ All mods installed successfully for safe version!")
  }

  // Export safe version
  const safe_export = export_modpack()
  if (!safe_export) {
    console.error("❌ Failed to export safe version")
    process.exit(1)
  }

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

  // Update README with full mod list
  console.log("\n" + "=".repeat(60))
  console.log("Updating README.md...")
  console.log("=".repeat(60) + "\n")

  console.log("\nUpdating README.md with mod list...\n")
  await update_readme(failed_mods_full)

  console.log("\n" + "=".repeat(60))
  console.log("✅ ALL DONE!")
  console.log("=".repeat(60))
}

main()
