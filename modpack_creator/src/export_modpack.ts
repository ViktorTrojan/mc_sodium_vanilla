import { spawnSync } from "node:child_process"
import { existsSync, renameSync } from "node:fs"
import { resolve } from "node:path"
import { get_minecraft_version, get_pack_version } from "./pack_toml"

/**
 * Export the modpack using packwiz and rename it with the appropriate variant suffix.
 *
 * The exported file will be named: "Sodium Vanilla-{mc_version}_{modpack_version}_{variant}.mrpack"
 * Example: "Sodium Vanilla-1.21.10_0.1.0_full.mrpack"
 *
 * @param variant - The modpack variant: "full" or "safe"
 * @returns The path to the exported .mrpack file, or null if export failed
 */
export function export_modpack(variant: "full" | "safe"): string | null {
  const root_dir = resolve(__dirname, "../..")

  console.log(`Exporting modpack with packwiz (${variant} variant)...`)

  const result = spawnSync("packwiz", ["modrinth", "export"], {
    encoding: "utf-8",
    stdio: "pipe",
    cwd: root_dir
  })

  if (result.error || result.status !== 0) {
    console.error("❌ Failed to export modpack")
    if (result.stderr) {
      console.error(result.stderr)
    }
    return null
  }

  console.log(result.stdout)

  // Extract the filename from "Modpack exported to <filename>"
  const match = result.stdout.match(/to\s+(.+\.mrpack)/i)

  if (!match?.[1]) {
    console.error("❌ Could not determine exported filename")
    return null
  }

  const original_filename = match[1].trim()
  const original_path = resolve(root_dir, original_filename)

  // Check if the file exists
  if (!existsSync(original_path)) {
    console.error(`❌ Exported file not found: ${original_path}`)
    return null
  }

  // Get versions from pack.toml
  const mc_version = get_minecraft_version()
  const modpack_version = get_pack_version()

  // Create the new filename with format: "Sodium Vanilla-{mc_version}_{modpack_version}_{variant}.mrpack"
  const new_filename = `Sodium Vanilla-${mc_version}_${modpack_version}_${variant}.mrpack`
  const new_path = resolve(root_dir, new_filename)

  // Rename the file
  try {
    renameSync(original_path, new_path)
    console.log(`✅ Successfully exported and renamed: ${new_filename}`)
    return new_filename
  } catch (error) {
    console.error(`❌ Failed to rename file: ${error}`)
    return null
  }
}
