import { install_packwiz_content } from "./install_mods"
import { mod_list } from "./mod_list"
import { resource_pack_list } from "./resource_pack_list"
import { update_readme } from "./update_readme"
import { save_missing_mod_list_json } from "./write_mod_list"

export async function install_and_update() {
  console.log("Installing mods and resource packs with packwiz...\n")

  const installation_result = install_packwiz_content(mod_list, resource_pack_list)

  console.log(`\n${"=".repeat(50)}`)

  if (installation_result.failed_mods.length > 0) {
    console.log(`\n❌ ${installation_result.failed_mods.length} mod(s) failed to install:`)
    for (const mod of installation_result.failed_mods) {
      console.log(`   - ${mod}`)
    }
  } else {
    console.log("\n✅ All mods installed successfully!")
  }

  // Save missing mod list JSON
  if (installation_result.mod_installation_details.size > 0) {
    console.log("\nSaving missing mod list JSON...\n")
    save_missing_mod_list_json(mod_list, installation_result.mod_installation_details)
  }

  console.log("\nUpdating README.md with mod list...\n")
  await update_readme(installation_result.failed_mods, installation_result.mod_installation_details)
}
