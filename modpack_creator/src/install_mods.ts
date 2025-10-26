import type { ModDefinition, ResourcePackDefinition } from "./types"
import { spawnSync } from "child_process"
import { resolve } from "path"
import { config } from "./config"
import { rmSync, readdirSync } from "fs"

export function install_packwiz_content(
  mod_list: ModDefinition[],
  resource_pack_list: ResourcePackDefinition[]
): string[] {
  const failed_mods: string[] = []
  const root_dir = resolve(__dirname, "../..")

  // Clean up old files
  console.log("Cleaning up old files...")

  // Remove mods directory
  try {
    rmSync(resolve(root_dir, "mods"), { recursive: true, force: true })
    console.log("✅ Cleared mods/ directory")
  } catch (error) {
    console.log("⚠️  mods/ directory does not exist or could not be deleted")
  }

  // Remove resourcepacks directory
  try {
    rmSync(resolve(root_dir, "resourcepacks"), { recursive: true, force: true })
    console.log("✅ Cleared resourcepacks/ directory")
  } catch (error) {
    console.log("⚠️  resourcepacks/ directory does not exist or could not be deleted")
  }

  // Remove all .mrpack files
  try {
    const files = readdirSync(root_dir)
    const mrpack_files = files.filter(file => file.endsWith(".mrpack"))
    for (const file of mrpack_files) {
      rmSync(resolve(root_dir, file), { force: true })
      console.log(`✅ Deleted ${file}`)
    }
  } catch (error) {
    console.log("⚠️  Could not delete .mrpack files")
  }

  console.log()

  // First migrate to the correct Minecraft version
  console.log(`Migrating to Minecraft version ${config.app.mc_version}...`)
  const migrate_result = spawnSync("packwiz", ["migrate", "minecraft", config.app.mc_version, "-y"], {
    encoding: "utf-8",
    stdio: "pipe",
    cwd: root_dir
  })

  if (migrate_result.error || migrate_result.status !== 0) {
    console.error(`❌ Failed to migrate to Minecraft ${config.app.mc_version}`)
    if (migrate_result.stderr) {
      console.error(migrate_result.stderr)
    }
    process.exit(1)
  }

  console.log(`✅ Successfully migrated to Minecraft ${config.app.mc_version}\n`)

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

  // Install resource packs
  console.log("\n" + "=".repeat(60))
  console.log("Installing resource packs...")
  console.log("=".repeat(60) + "\n")

  for (const pack of resource_pack_list) {
    console.log(`Installing resource pack ${pack.identifier}...`)

    const result = spawnSync("packwiz", ["modrinth", "add", pack.identifier, "-y"], {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: root_dir
    })

    if (result.error || result.status !== 0) {
      console.error(`❌ Failed to install resource pack ${pack.identifier}`)
      if (result.stderr) {
        console.error(result.stderr)
      }
    } else {
      console.log(`✅ Successfully installed resource pack ${pack.identifier}`)
    }
  }

  return failed_mods
}
