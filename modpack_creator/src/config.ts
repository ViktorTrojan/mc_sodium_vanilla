const is_production = process.env.NODE_ENV === "production"

function get_env_variable(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable "${name}" is not set.`)
  }
  return value
}

export const config = {
  app: {
    env: process.env.NODE_ENV ?? "development",
    is_development: !is_production,
    is_production: is_production,
    mc_version: get_env_variable("MC_VERSION")
  }
}

export type ConfigType = typeof config
