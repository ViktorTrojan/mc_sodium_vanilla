import { describe, expect, it } from "bun:test"
import type { ModInstallationState } from "../src/types"
import { compare_states } from "../src/update_detector"

describe("compare_states", () => {
  it("should return false for identical states", () => {
    const state: ModInstallationState = {
      successful: [
        { method: "modrinth", identifier: "sodium", category: "optimization" },
        { method: "modrinth", identifier: "lithium", category: "optimization" }
      ],
      failed: [],
      alternative_installed: []
    }

    expect(compare_states(state, state)).toBe(false)
  })

  it("should return false for identical states with different order", () => {
    const state1: ModInstallationState = {
      successful: [
        { method: "modrinth", identifier: "sodium", category: "optimization" },
        { method: "modrinth", identifier: "lithium", category: "optimization" }
      ],
      failed: [],
      alternative_installed: []
    }

    const state2: ModInstallationState = {
      successful: [
        { method: "modrinth", identifier: "lithium", category: "optimization" },
        { method: "modrinth", identifier: "sodium", category: "optimization" }
      ],
      failed: [],
      alternative_installed: []
    }

    expect(compare_states(state1, state2)).toBe(false)
  })

  it("should return true when successful mods differ", () => {
    const old_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "optimization" }],
      failed: [],
      alternative_installed: []
    }

    const new_state: ModInstallationState = {
      successful: [
        { method: "modrinth", identifier: "sodium", category: "optimization" },
        { method: "modrinth", identifier: "lithium", category: "optimization" }
      ],
      failed: [],
      alternative_installed: []
    }

    expect(compare_states(old_state, new_state)).toBe(true)
  })

  it("should return true when failed mods differ", () => {
    const old_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "optimization" }],
      failed: [],
      alternative_installed: []
    }

    const new_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "optimization" }],
      failed: [{ method: "modrinth", identifier: "broken-mod", category: "optimization" }],
      alternative_installed: []
    }

    expect(compare_states(old_state, new_state)).toBe(true)
  })

  it("should return true when alternative_installed mods differ", () => {
    const old_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "optimization" }],
      failed: [],
      alternative_installed: []
    }

    const new_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "optimization" }],
      failed: [],
      alternative_installed: [{ method: "modrinth", identifier: "alt-mod", category: "optimization" }]
    }

    expect(compare_states(old_state, new_state)).toBe(true)
  })

  it("should return true when mod category changes", () => {
    const old_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "optimization" }],
      failed: [],
      alternative_installed: []
    }

    const new_state: ModInstallationState = {
      successful: [{ method: "modrinth", identifier: "sodium", category: "visual" }],
      failed: [],
      alternative_installed: []
    }

    expect(compare_states(old_state, new_state)).toBe(true)
  })

  it("should handle complex states with all arrays populated", () => {
    const state1: ModInstallationState = {
      successful: [
        { method: "modrinth", identifier: "sodium", category: "optimization" },
        { method: "modrinth", identifier: "lithium", category: "optimization" }
      ],
      failed: [{ method: "modrinth", identifier: "broken-mod", category: "useful" }],
      alternative_installed: [{ method: "modrinth", identifier: "alt-mod", category: "visual" }]
    }

    const state2: ModInstallationState = {
      successful: [
        { method: "modrinth", identifier: "lithium", category: "optimization" },
        { method: "modrinth", identifier: "sodium", category: "optimization" }
      ],
      failed: [{ method: "modrinth", identifier: "broken-mod", category: "useful" }],
      alternative_installed: [{ method: "modrinth", identifier: "alt-mod", category: "visual" }]
    }

    expect(compare_states(state1, state2)).toBe(false)
  })
})
