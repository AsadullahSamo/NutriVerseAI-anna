import { describe, it, expect } from "vitest"
import { db } from "../src/anna/db"

describe("db chunking", () => {
  it("keeps every stored value under 64 KB and reloads all rows", async () => {
    const big = "x".repeat(6000)
    for (let i = 0; i < 40; i++) await db.insert("chunkTest", { title: `row ${i}`, body: big })
    const stored = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith("nva:db/chunkTest/")) stored.push([k, localStorage.getItem(k).length])
    }
    expect(stored.length).toBeGreaterThan(3)
    for (const [, len] of stored) expect(len).toBeLessThan(64000)
    expect((await db.list("chunkTest")).length).toBe(40)

    // remove most rows: surplus chunks are deleted
    await db.removeWhere("chunkTest", r => Number(r.title.split(" ")[1]) >= 5)
    const after = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith("nva:db/chunkTest/") && !k.endsWith("meta")) after.push(k)
    }
    expect(after.length).toBe(1)
    expect((await db.list("chunkTest")).length).toBe(5)
  })
})
