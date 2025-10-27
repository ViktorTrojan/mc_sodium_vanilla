import { config } from "./config"
import { upload_to_modrinth } from "./upload_to_modrinth"

const result = await upload_to_modrinth({
  file_path: "/app/Sodium Vanilla-0.1.0.mrpack",
  version_number: `${config.app.mc_version}_safe`,
  version_title: `Sodium Vanilla ${config.app.mc_version} (Safe)`,
  changelog: `Safe to use version for servers for Minecraft ${config.app.mc_version}`,
  project_id: config.app.modrinth_project_id,
  game_versions: [config.app.mc_version],
  loaders: ["fabric"]
})
console.log(result)
