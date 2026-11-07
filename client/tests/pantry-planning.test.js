import { describe, it, expect, beforeEach } from "vitest"
import { dispatch } from "../src/anna/router"
import "../src/anna/handlers/grocery"
import "../src/anna/handlers/pantry"
import "../src/anna/handlers/meal-plans"

const call = (m, p, b) => dispatch(m, p, "", b)
const day = n => ({ day: n, meals: { breakfast: { title: "b" }, snacks: [] }, totalCalories: 1 })

beforeEach(() => {
  globalThis.__NVA_AI_MOCK = async () => JSON.stringify([day(1), day(2)])
})

describe("grocery lists", () => {
  it("crud", async () => {
    expect((await call("GET", "/api/grocery-lists")).data).toEqual([])
    const c = await call("POST", "/api/grocery-lists", { title: "Weekly", items: [{ name: "milk" }] })
    expect(c.status).toBe(201)
    expect(c.data).toMatchObject({ title: "Weekly", completed: false, expiryDates: null, userId: 1 })
    const p = await call("PATCH", `/api/grocery-lists/${c.data.id}`, { completed: true })
    expect(p.data.completed).toBe(true)
    expect(p.data.title).toBe("Weekly")
    expect((await call("GET", "/api/grocery-lists")).data).toHaveLength(1)
    expect((await call("DELETE", `/api/grocery-lists/${c.data.id}`)).status).toBe(204)
    expect((await call("GET", "/api/grocery-lists")).data).toEqual([])
  })
  it("rejects missing title", async () => {
    const r = await call("POST", "/api/grocery-lists", { items: [] })
    expect(r.status).toBe(400)
    expect(r.data.message).toBeTruthy()
  })
})

describe("pantry", () => {
  it("crud", async () => {
    const c = await call("POST", "/api/pantry", { name: "Rice", quantity: "1 kg", category: "Grains", expiryDate: "2030-01-01" })
    expect(c.status).toBe(201)
    expect(c.data.expiryDate).toBe("2030-01-01T00:00:00.000Z")
    const p = await call("PATCH", `/api/pantry/${c.data.id}`, { name: "Brown rice", expiryDate: null })
    expect(p.data).toMatchObject({ name: "Brown rice", expiryDate: null })
    expect((await call("GET", "/api/pantry")).data.some(i => i.id === c.data.id)).toBe(true)
    expect((await call("DELETE", `/api/pantry/${c.data.id}`)).status).toBe(204)
    expect((await call("DELETE", "/api/pantry/abc")).status).toBe(400)
  })
  it("fills in nutrition and sustainability defaults", async () => {
    const c = await call("POST", "/api/pantry", { name: "Salt", quantity: "1 kg" })
    expect(c.data.sustainabilityInfo.score).toBe(0)
    expect(c.data.nutritionInfo.calories).toBe(0)
    const list = (await call("GET", "/api/pantry")).data
    expect(list.find(i => i.name === "Salt").sustainabilityInfo.carbonFootprint).toBe("low")
  })

  it("POST /api/pantryItems", async () => {
    const r = await call("POST", "/api/pantryItems", { name: "Oats", quantity: "500g", category: "Grains" })
    expect(r.status).toBe(201)
    expect(r.data.id).toBeTypeOf("number")
  })
  it("rejects missing name", async () => {
    expect((await call("POST", "/api/pantry", { quantity: "1" })).status).toBe(400)
  })
  it("generate-pantry-item", async () => {
    globalThis.__NVA_AI_MOCK = async () => '```json\n{"name":"Milk","expiryDays":7}\n```'
    const r = await call("POST", "/api/ai/generate-pantry-item", { itemName: "Milk" })
    expect(r.data).toEqual({ name: "Milk", expiryDays: 7 })
    const bad = await call("POST", "/api/ai/generate-pantry-item", {})
    expect(bad.status).toBe(400)
    expect(bad.data.error).toBeTruthy()
  })
})

describe("meal plans", () => {
  it("crud with AI generation", async () => {
    const c = await call("POST", "/api/meal-plans", {
      title: "Plan A", startDate: "2030-01-01T00:00:00.000Z", endDate: "2030-01-02T00:00:00.000Z",
      preferences: ["vegan"], days: 2
    })
    expect(c.status).toBe(201)
    expect(c.data.meals).toHaveLength(2)
    expect(c.data.isActive).toBe(true)
    const p = await call("PATCH", `/api/meal-plans/${c.data.id}`, { isActive: false })
    expect(p.data.isActive).toBe(false)
    const list = (await call("GET", "/api/meal-plans")).data
    expect(list.some(x => x.id === c.data.id)).toBe(true)
    expect((await call("DELETE", `/api/meal-plans/${c.data.id}`)).status).toBe(204)
  })
  it("rejects missing title", async () => {
    const r = await call("POST", "/api/meal-plans", { startDate: "2030-01-01", endDate: "2030-01-02" })
    expect(r.status).toBe(400)
  })
  it("POST /api/ai/meal-plan", async () => {
    const r = await call("POST", "/api/ai/meal-plan", { preferences: ["quick"], days: 2 })
    expect(r.data).toHaveLength(2)
    expect((await call("POST", "/api/ai/meal-plan", {})).status).toBe(400)
    const long = await call("POST", "/api/ai/meal-plan", { preferences: [], days: 9 })
    expect(long.status).toBe(400)
    expect(long.data.error).toBeTruthy()
  })
})
