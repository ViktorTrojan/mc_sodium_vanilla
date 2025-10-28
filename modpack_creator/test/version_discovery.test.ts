import { describe, expect, it } from "bun:test"
import { get_current_minecraft_versions, is_valid_version, parse_version } from "../src/version_discovery"

describe("parse_version", () => {
  it("should parse major.minor.patch versions", () => {
    expect(parse_version("1.21.10")).toEqual({ major: 1, minor: 21, patch: 10 })
  })

  it("should parse major.minor versions (patch defaults to 0)", () => {
    expect(parse_version("1.14")).toEqual({ major: 1, minor: 14, patch: 0 })
  })

  it("should parse future major versions", () => {
    expect(parse_version("2.0.0")).toEqual({ major: 2, minor: 0, patch: 0 })
  })

  it("should return null for invalid formats", () => {
    expect(parse_version("b1.16.6")).toBeNull()
    expect(parse_version("25w41a")).toBeNull()
    expect(parse_version("1.x.3")).toBeNull()
    expect(parse_version("invalid")).toBeNull()
  })
})

describe("is_valid_version", () => {
  it("should accept 1.14 and above", () => {
    expect(is_valid_version("1.14")).toBe(true)
    expect(is_valid_version("1.14.1")).toBe(true)
    expect(is_valid_version("1.21.10")).toBe(true)
  })

  it("should reject versions below 1.14", () => {
    expect(is_valid_version("1.13.3")).toBe(false)
    expect(is_valid_version("1.12.2")).toBe(false)
    expect(is_valid_version("1.0.0")).toBe(false)
  })

  it("should accept future major versions", () => {
    expect(is_valid_version("2.0.0")).toBe(true)
    expect(is_valid_version("3.5.2")).toBe(true)
  })

  it("should reject invalid formats", () => {
    expect(is_valid_version("b1.16.6")).toBe(false)
    expect(is_valid_version("25w41a")).toBe(false)
    expect(is_valid_version("invalid")).toBe(false)
  })
})

describe("get_current_minecraft_versions", () => {
  it("should fetch and return valid release versions from real API", async () => {
    // This makes a real API call to Modrinth
    const versions = await get_current_minecraft_versions()

    // Verify at least some versions are returned
    expect(versions.length).toBeGreaterThan(0)

    // Verify all returned versions are valid (>= 1.14)
    for (const version of versions) {
      expect(is_valid_version(version)).toBe(true)
    }

    // Verify versions are sorted
    const sorted_versions = [...versions].sort()
    expect(versions).toEqual(sorted_versions)

    // Verify specific known versions are present
    expect(versions).toContain("1.14")
    expect(versions.some((v) => v.startsWith("1.21"))).toBe(true)
  })
})
