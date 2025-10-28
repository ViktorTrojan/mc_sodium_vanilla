import { describe, expect, it } from "bun:test"
import { increment_version, parse_tag } from "../src/git_tag_manager"

describe("parse_tag", () => {
  it("should parse valid tag with major.minor MC version", () => {
    expect(parse_tag("1.14_0.1.0")).toEqual({
      mc_version: "1.14",
      modpack_version: "0.1.0"
    })
  })

  it("should parse valid tag with major.minor.patch MC version", () => {
    expect(parse_tag("1.21.10_0.1.0")).toEqual({
      mc_version: "1.21.10",
      modpack_version: "0.1.0"
    })
  })

  it("should parse tag with higher modpack version", () => {
    expect(parse_tag("1.21.10_0.1.5")).toEqual({
      mc_version: "1.21.10",
      modpack_version: "0.1.5"
    })
  })

  it("should return null for invalid tag formats", () => {
    expect(parse_tag("invalid")).toBeNull()
    expect(parse_tag("1.14")).toBeNull()
    expect(parse_tag("1.14_0.1")).toBeNull()
    expect(parse_tag("v1.14_0.1.0")).toBeNull()
    expect(parse_tag("1.14_v0.1.0")).toBeNull()
  })
})

describe("increment_version", () => {
  it("should increment patch version", () => {
    expect(increment_version("0.1.0")).toBe("0.1.1")
    expect(increment_version("0.1.5")).toBe("0.1.6")
    expect(increment_version("0.1.9")).toBe("0.1.10")
  })

  it("should handle double-digit patch versions", () => {
    expect(increment_version("0.1.10")).toBe("0.1.11")
    expect(increment_version("0.1.99")).toBe("0.1.100")
  })

  it("should handle different major/minor versions", () => {
    expect(increment_version("1.0.0")).toBe("1.0.1")
    expect(increment_version("2.5.3")).toBe("2.5.4")
  })
})
