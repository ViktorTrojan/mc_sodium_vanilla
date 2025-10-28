# Bun Runtime Rules

This project uses Bun as the runtime for the TypeScript tooling in `modpack_creator/`. Prefer Bun's built-in APIs over third-party packages when possible.

## Built-in APIs Used in This Project

- `Bun.file()` - Read files efficiently. Used in [git_tag_manager.ts](modpack_creator/src/git_tag_manager.ts:226) and [read_installation_state.ts](modpack_creator/src/read_installation_state.ts:11)
- `Bun.write()` - Write files. Used in [write_mod_list.ts](modpack_creator/src/write_mod_list.ts:118)
- `Bun.TOML.parse()` - Parse TOML files natively. Used in [pack_toml.ts](modpack_creator/src/pack_toml.ts:30)

## Other Useful Bun APIs

If you need these features, prefer Bun's built-in APIs:

- `Bun.serve()` - HTTP server with WebSocket support. Don't use `express`.
- `bun:sqlite` - SQLite database. Don't use `better-sqlite3`.
- `Bun.sql` - Postgres client. Don't use `pg` or `postgres.js`.
- `Bun.$` - Shell commands. Don't use `execa`.
- `WebSocket` - Built-in WebSocket. Don't use `ws` package.

## Environment Variables

Bun automatically loads `.env` files from:
- `modpack_creator/.env` (gitignored, for local development)
- `modpack_creator/.env.example` (committed, shows expected variables)

**NEVER** use the `dotenv` package - Bun loads `.env` files automatically.

## File I/O

Prefer Bun's file APIs over Node.js `fs` module:

```typescript
// ✅ CORRECT: Using Bun.file()
const file = Bun.file(file_path)
const content = await file.text()

// ✅ CORRECT: Using Bun.write()
await Bun.write(output_path, JSON.stringify(data, null, 2))

// ❌ AVOID: Node.js fs (less efficient with Bun)
import { readFile, writeFile } from "node:fs/promises"
const content = await readFile(file_path, "utf-8")
await writeFile(output_path, data)
```
