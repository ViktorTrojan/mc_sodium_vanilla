import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

export function export_modpack(): string | null {
  const root_dir = resolve(__dirname, "../..")

  console.log("Exporting modpack with packwiz...")

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

  if (match?.[1]) {
    const filename = match[1].trim()
    console.log(`✅ Successfully exported: ${filename}`)
    return filename
  }

  console.error("❌ Could not determine exported filename")
  return null
}
