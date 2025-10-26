import { install_mods_with_packwiz } from "./install_mods"
import { get_mod_list_markdown } from "./write_mod_list"
import { mod_list } from "./mod_list"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { update_readme } from "./update_readme"

export async function install_and_update() {
  console.log("Installing mods with packwiz...\n")

  const failed_mods = install_mods_with_packwiz(mod_list)

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
