import { describe, it, expect, afterEach } from "vitest"
import { dispatch } from "../src/anna/router"
import "../src/anna/handlers/community"
import "../src/anna/handlers/storage"
import "../src/anna/handlers/pantry"

afterEach(() => { delete globalThis.__NVA_AI_MOCK })

describe("community", () => {
  it("creates, edits, lists newest first, deletes", async () => {
    expect((await dispatch("POST", "/api/community", "", { content: "  ", type: "COOKING_TIP" })).status).toBe(400)
    const a = await dispatch("POST", "/api/community", "", { content: "Salt the water", type: "COOKING_TIP" })
    expect(a.status).toBe(201)
    const b = await dispatch("POST", "/api/community", "", { content: "Use stale bread", type: "FOOD_RESCUE" })
    const list = (await dispatch("GET", "/api/community", "")).data
    expect(list).toHaveLength(2)
    const e = await dispatch("PATCH", `/api/community/${a.data.id}`, "", { content: "Salt well" })
    expect(e.data.content).toBe("Salt well")
    expect((await dispatch("PATCH", "/api/community/999", "", { content: "x" })).status).toBe(404)
    expect((await dispatch("DELETE", `/api/community/${b.data.id}`, "")).data).toEqual({ success: true })
  })
})

describe("kitchen storage", () => {
  it("groups pantry items into zones and flags expiring ones", async () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString()
    await dispatch("POST", "/api/pantry", "", { name: "Milk", category: "Dairy", quantity: 1, unit: "l", expiryDate: soon })
    await dispatch("POST", "/api/pantry", "", { name: "Rice", category: "Grains", quantity: 1, unit: "kg" })
    await dispatch("POST", "/api/pantry", "", { name: "Peas", category: "Frozen", quantity: 1, unit: "bag" })
    const r = (await dispatch("GET", "/api/kitchen-storage", "")).data
    expect(r.zones.fridge.map(i => i.name)).toContain("Milk")
    expect(r.zones.freezer.map(i => i.name)).toContain("Peas")
    expect(r.zones.pantry.map(i => i.name)).toContain("Rice")
    expect(r.expiring[0].name).toBe("Milk")
    expect((await dispatch("POST", "/api/kitchen-storage/tips", "", { items: [] })).status).toBe(400)
  })
})
