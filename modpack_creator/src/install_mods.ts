import type { ModDefinition } from "./types"
import { spawnSync } from "child_process"
import { resolve } from "path"

export function install_mods_with_packwiz(mod_list: ModDefinition[]): string[] {
  const failed_mods: string[] = []
  const root_dir = resolve(__dirname, "../..")

  for (const mod of mod_list) {
    console.log(`Installing ${mod.identifier}...`)

    const result = spawnSync("packwiz", ["modrinth", "add", mod.identifier, "-y"], {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: root_dir
    })

    if (result.error || result.status !== 0) {
      console.error(`❌ Failed to install ${mod.identifier}`)
      if (result.stderr) {
        console.error(result.stderr)
      }

      // Try alternatives if they exist
      let alternative_succeeded = false

      if (mod.alternatives) {
        for (const alt of mod.alternatives) {
          console.log(`Trying alternative ${alt.identifier}...`)

          const alt_result = spawnSync("packwiz", ["modrinth", "add", alt.identifier, "-y"], {
            encoding: "utf-8",
            stdio: "pipe",
            cwd: root_dir
          })

          if (alt_result.error || alt_result.status !== 0) {
            console.error(`❌ Alternative ${alt.identifier} also failed`)
            if (alt_result.stderr) {
              console.error(alt_result.stderr)
            }
          } else {
            console.log(`✅ Successfully installed alternative ${alt.identifier}`)
            alternative_succeeded = true
            break
          }
        }
      }

      // Only mark as failed if no alternative succeeded
      if (!alternative_succeeded) {
        failed_mods.push(mod.identifier)
      }
    } else {
      console.log(`✅ Successfully installed ${mod.identifier}`)
    }
  }

  return failed_mods
}
