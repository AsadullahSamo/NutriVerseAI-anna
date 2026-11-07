import { describe, it, expect, afterEach } from "vitest"
import { dispatch } from "../src/anna/router"
import { db } from "../src/anna/db"
import "../src/anna/handlers/kitchen"

const post = (p, b) => dispatch("POST", p, "", b)

afterEach(() => { delete globalThis.__NVA_AI_MOCK })

describe("kitchen equipment CRUD", () => {
  it("adds, lists, updates maintenance, deletes", async () => {
    expect((await dispatch("GET", "/api/kitchen-equipment", "")).data).toEqual([])
    const add = await post("/api/kitchen-equipment", { name: "Wok", category: "cookware", condition: "good" })
    expect(add.status).toBe(200)
    expect(add.data).toMatchObject({ name: "Wok", userId: 1 })
    expect(typeof add.data.id).toBe("number")
    expect((await dispatch("GET", "/api/kitchen-equipment", "")).data).toHaveLength(1)

    const m = await post(`/api/kitchen-equipment/${add.data.id}/maintenance`, { maintenanceDate: "2026-01-02", notes: "seasoned" })
    expect(m.data).toMatchObject({ lastMaintenanceDate: "2026-01-02", maintenanceNotes: "seasoned", name: "Wok" })
    expect((await post("/api/kitchen-equipment/9999/maintenance", {})).status).toBe(404)

    const del = await dispatch("DELETE", `/api/kitchen-equipment/${add.data.id}`, "")
    expect(del.data).toEqual({ success: true })
    expect((await dispatch("GET", "/api/kitchen-equipment", "")).data).toEqual([])
  })
})

describe("kitchen AI routes", () => {
  it("recommendations", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify([{ name: "Blender" }])
    const r = await post("/api/kitchen-equipment/recommendations", { currentEquipment: [], cookingPreferences: ["Italian"], budget: 100 })
    expect(r.data).toEqual([{ name: "Blender" }])
  })

  it("recipe-matches includes saved recipes in prompt", async () => {
    await db.insert("recipes", { title: "Unique Saved Soup" })
    let seen
    globalThis.__NVA_AI_MOCK = async ({ prompt }) => { seen = prompt; return JSON.stringify({ canMake: [{ id: 1, title: "x" }], needsEquipment: [] }) }
    const r = await post("/api/kitchen-equipment/recipe-matches", { equipment: [{ name: "Pot" }], userPreferences: ["Healthy"] })
    expect(r.data.canMake).toHaveLength(1)
    expect(seen).toContain("Unique Saved Soup")
  })

  it("recipe-matches rejects bad structure", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({ foo: 1 })
    const r = await post("/api/kitchen-equipment/recipe-matches", { equipment: [] })
    expect(r.status).toBe(500)
    expect(r.data.message).toBeTruthy()
  })

  it("maintenance-tips returns AI tips, falls back on bad output", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify(["Tip one", " Tip two "])
    const ok = await post("/api/kitchen-equipment/maintenance-tips", { equipment: { name: "Wok", condition: "good" } })
    expect(ok.data).toEqual(["Tip one", "Tip two"])
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({ not: "array" })
    const fb = await post("/api/kitchen-equipment/maintenance-tips", { equipment: { name: "Chef Knife", condition: "fair" } })
    expect(Array.isArray(fb.data)).toBe(true)
    expect(fb.data.length).toBeGreaterThan(3)
  })

  it("maintenance-schedule happy and 400 paths", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify([{ equipmentId: 1, tasks: ["clean"] }])
    const ok = await post("/api/kitchen-equipment/maintenance-schedule", { equipment: [{ id: 1 }], startDate: "2026-01-01", endDate: "2026-02-01" })
    expect(ok.data[0].equipmentId).toBe(1)
    const bad = await post("/api/kitchen-equipment/maintenance-schedule", {})
    expect(bad.status).toBe(400)
    expect(bad.data.error).toBe("Equipment array is required")
  })

  it("analysis", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({ maintenanceRecommendations: [], shoppingRecommendations: [], recipeRecommendations: [] })
    const r = await post("/api/kitchen-equipment/analysis", { equipment: [], userPreferences: ["Vegan"] })
    expect(r.data).toHaveProperty("shoppingRecommendations")
  })

  it("surfaces AI failure as error body", async () => {
    globalThis.__NVA_AI_MOCK = async () => { throw new Error("boom") }
    const r = await post("/api/kitchen-equipment/analysis", { equipment: [] })
    expect(r.status).toBe(500)
    expect(r.data.message).toBe("boom")
    expect(r.data.error).toBe("Failed to generate kitchen analysis")
  })
})
