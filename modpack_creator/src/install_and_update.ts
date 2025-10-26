import { install_packwiz_content } from "./install_mods"
import { mod_list } from "./mod_list"
import { resource_pack_list } from "./resource_pack_list"
import { update_readme } from "./update_readme"

export async function install_and_update() {
  console.log("Installing mods and resource packs with packwiz...\n")

  const failed_mods = install_packwiz_content(mod_list, resource_pack_list)

  console.log("\n" + "=".repeat(50))

  if (failed_mods.length > 0) {
    console.log(`\n❌ ${failed_mods.length} mod(s) failed to install:`)
    for (const mod of failed_mods) {
      console.log(`   - ${mod}`)
    }
  } else {
    console.log("\n✅ All mods installed successfully!")
  }

  console.log("\nUpdating README.md with mod list...\n")
  await update_readme(failed_mods)
}
