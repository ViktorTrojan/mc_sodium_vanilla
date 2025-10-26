import { readFileSync } from "fs"
import { resolve } from "path"
import { config } from "./config"

interface ModrinthUploadOptions {
  file_path: string
  version_number: string
  version_title: string
  changelog: string
  project_id: string
  game_versions: string[]
  loaders: string[]
}

export async function upload_to_modrinth(options: ModrinthUploadOptions): Promise<boolean> {
  const root_dir = resolve(__dirname, "../..")
  const full_file_path = resolve(root_dir, options.file_path)

  console.log(`Uploading ${options.file_path} to Modrinth...`)

  try {
    const file_data = readFileSync(full_file_path)

    const form_data = new FormData()

    // Add version metadata as JSON first
    const filename = options.file_path.split('/').pop() || options.file_path
    const version_data = {
      name: options.version_title,
      version_number: options.version_number,
      changelog: options.changelog,
      dependencies: [],
      game_versions: options.game_versions,
      version_type: "release",
      loaders: options.loaders,
      featured: true,
      project_id: options.project_id,
      file_parts: [filename]
    }

    form_data.append("data", JSON.stringify(version_data))

    // Add the file
    const blob = new Blob([file_data], { type: "application/zip" })
    form_data.append("file", blob, filename)

    const response = await fetch("https://api.modrinth.com/v2/version", {
      method: "POST",
      headers: {
        "Authorization": config.app.modrinth_pat_token
      },
      body: form_data
    })

    if (!response.ok) {
      const error_text = await response.text()
      console.error(`❌ Failed to upload to Modrinth: ${response.status} ${response.statusText}`)
      console.error(error_text)
      return false
    }

    const result = await response.json() as any
    console.log(`✅ Successfully uploaded to Modrinth: ${result.id}`)
    return true

  } catch (error) {
    console.error("❌ Error uploading to Modrinth:", error)
    return false
  }
}
