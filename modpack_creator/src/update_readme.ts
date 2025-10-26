import { get_mod_list_markdown } from "./write_mod_list"
import { mod_list } from "./mod_list"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

export async function update_readme(failed_to_install?: string[]) {
  const readme_path = resolve(__dirname, "../../README.md")
  const readme_content = readFileSync(readme_path, "utf-8")

  const mod_list_markdown = await get_mod_list_markdown(mod_list, failed_to_install)

  // Find the "## Mod List" section and replace everything after it
  const mod_list_header = "## Mod List"
  const mod_list_index = readme_content.indexOf(mod_list_header)

  if (mod_list_index === -1) {
    console.error("Could not find '## Mod List' section in README.md")
    process.exit(1)
  }

  // Get everything before the mod list section
  const before_mod_list = readme_content.substring(0, mod_list_index)

  // Combine and write
  const new_readme = before_mod_list + mod_list_header + "\n\n" + mod_list_markdown

  writeFileSync(readme_path, new_readme, "utf-8")

  console.log("✅ README.md updated successfully!")
}
