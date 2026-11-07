import { describe, it, expect, beforeEach } from "vitest"
import { dispatch } from "../src/anna/router"
import "../src/anna/handlers/cultural"
import { db } from "../src/anna/db"

const call = (m, p, body, search = "") => dispatch(m, p, search, body)

describe("cultural handlers", () => {
  beforeEach(() => {
    globalThis.__NVA_AI_MOCK = undefined
  })

  it("cuisine CRUD, hide, and listing", async () => {
    expect((await call("GET", "/api/cultural-cuisines")).data).toEqual([])
    const bad = await call("POST", "/api/cultural-cuisines", { name: "x" })
    expect(bad.status).toBe(400)
    expect(bad.data.message).toBe("Name and region are required")

    const c = await call("POST", "/api/cultural-cuisines", {
      name: "Thai", region: "southeast asia", keyIngredients: ["rice"],
      culturalContext: { history: "h" }, servingEtiquette: { general: "g" }
    })
    expect(c.status).toBe(201)
    const id = c.data.id
    const d = await call("POST", "/api/cultural-cuisines", { name: "Other", region: "r" })

    const list = await call("GET", "/api/cultural-cuisines")
    expect(list.data.map(x => x.name)).toEqual(["Thai", "Other"])

    const patched = await call("PATCH", `/api/cultural-cuisines/${id}`, { description: "spicy" })
    expect(patched.data.description).toBe("spicy")
    expect((await call("PATCH", "/api/cultural-cuisines/9999", {})).status).toBe(404)

    const hide = await call("POST", `/api/cultural-cuisines/${d.data.id}/hide`)
    expect(hide.data.type).toBe("hidden")
    expect((await call("POST", `/api/cultural-cuisines/${d.data.id}/hide`)).status).toBe(400)
    expect((await call("GET", "/api/cultural-cuisines")).data.map(x => x.name)).toEqual(["Thai"])

    const del = await call("DELETE", `/api/cultural-cuisines/${id}`)
    expect(del.data.id).toBe(id)
    expect((await call("GET", `/api/cultural-cuisines/${id}`)).status).toBe(404)
    expect((await call("DELETE", `/api/cultural-cuisines/${id}`)).status).toBe(404)
  })

  it("recipes: create, detail with cuisine, patch, hide, delete, per-cuisine add", async () => {
    const cu = (await call("POST", "/api/cultural-cuisines", { name: "Japanese", region: "East Asia" })).data
    expect((await call("POST", "/api/cultural-recipes", { name: "n" })).status).toBe(400)
    const r = await call("POST", "/api/cultural-recipes", {
      name: "Sushi", description: "rice", cuisineId: cu.id, authenticIngredients: ["rice"]
    })
    expect(r.status).toBe(201)
    expect(r.data.difficulty).toBe("beginner")

    const added = await call("POST", `/api/cultural-cuisines/${cu.id}/recipes`, {
      name: "Ramen", description: "noodles", image_url: "http://x/y.png"
    })
    expect(added.status).toBe(200)
    expect(added.data.cuisineId).toBe(cu.id)

    const detail = await call("GET", `/api/cultural-cuisines/${cu.id}`)
    expect(detail.data.recipes.map(x => x.name).sort()).toEqual(["Ramen", "Sushi"])
    expect(detail.data.techniques).toEqual([])
    expect(detail.data.keyIngredients).toEqual([])
    expect(detail.data.culturalContext).toEqual({})

    const byCuisine = await call("GET", "/api/cultural-recipes", null, `?cuisineId=${cu.id}`)
    expect(byCuisine.data).toHaveLength(2)
    expect((await call("GET", `/api/cultural-recipes/${r.data.id}`)).data.name).toBe("Sushi")

    const p = await call("PATCH", `/api/cultural-recipes/${r.data.id}`, { description: "vinegar rice" })
    expect(p.data.description).toBe("vinegar rice")
    expect((await call("PATCH", "/api/cultural-recipes/9999", {})).status).toBe(404)

    const h = await call("POST", `/api/cultural-recipes/${added.data.id}/hide`)
    expect(h.data.type).toBe("hidden")
    expect((await call("GET", `/api/cultural-cuisines/${cu.id}`)).data.recipes).toHaveLength(1)

    const del = await call("DELETE", `/api/cultural-recipes/${r.data.id}`)
    expect(del.data.id).toBe(r.data.id)
    expect((await call("DELETE", `/api/cultural-recipes/${r.data.id}`)).status).toBe(404)
  })

  it("pairings and etiquette merge region tables with AI, and fall back", async () => {
    const cu = (await call("POST", "/api/cultural-cuisines", { name: "Indian", region: "South Asia" })).data
    const r = (await call("POST", "/api/cultural-recipes", { name: "Dal", description: "d", cuisineId: cu.id })).data

    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({
      mainDishes: ["Paneer", "Biryani"], sideDishes: [], desserts: ["Barfi"], beverages: ["Lassi"],
      presentation: ["Brass bowls"], customs: [], taboos: [], servingOrder: []
    })
    const pr = await call("GET", `/api/cultural-recipes/${r.id}/pairings`)
    expect(pr.data.mainDishes).toContain("Paneer")
    expect(pr.data.mainDishes.filter(x => x === "Biryani")).toHaveLength(1)
    expect(pr.data.beverages.filter(x => x === "Lassi")).toHaveLength(1)
    const et = await call("GET", `/api/cultural-recipes/${r.id}/etiquette`)
    expect(et.data.presentation).toContain("Brass bowls")
    expect(et.data.taboos.length).toBeGreaterThan(0)

    globalThis.__NVA_AI_MOCK = async () => { throw new Error("boom") }
    const fb = await call("GET", `/api/cultural-recipes/${r.id}/pairings`)
    expect(fb.status).toBe(200)
    expect(fb.data.mainDishes).toContain("Butter Chicken")
    expect((await call("GET", "/api/cultural-recipes/9999/pairings")).status).toBe(404)
    expect((await call("GET", "/api/cultural-recipes/9999/etiquette")).status).toBe(404)
  })

  it("user-recipes lists general recipes newest first", async () => {
    expect((await call("GET", "/api/user-recipes")).data).toEqual([])
    await db.insert("recipes", { title: "Old", createdAt: "2020-01-01T00:00:00.000Z", createdBy: 1 })
    await db.insert("recipes", { title: "New", createdAt: "2024-01-01T00:00:00.000Z", createdBy: 1 })
    const { data } = await call("GET", "/api/user-recipes")
    expect(data.map(r => r.title)).toEqual(["New", "Old"])
    expect(data[0]).toHaveProperty("sustainabilityScore")
  })

  it("generate-cuisine-details returns the cultural details", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({
      description: "d", keyIngredients: "a\nb", cookingTechniques: "c",
      culturalContext: { history: "h" }, servingEtiquette: { general: "g" }
    })
    const ok = await call("POST", "/api/ai/generate-cuisine-details", { cuisine: { name: "Thai" } })
    expect(ok.status).toBe(200)
    expect(ok.data.culturalContext.history).toBe("h")
    expect((await call("POST", "/api/ai/generate-cuisine-details", {})).status).toBe(400)

    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({ nothing: true })
    expect((await call("POST", "/api/ai/generate-cuisine-details", { cuisine: { name: "Thai" } })).status).toBe(500)
  })

  it("generate-cultural-recipe handles recipe, cuisine-details and bad input", async () => {
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({
      description: "tasty", difficulty: "advanced", authenticIngredients: ["1 cup rice"], instructions: ["Step 1"]
    })
    const rec = await call("POST", "/api/ai/generate-cultural-recipe", { recipeName: "Sushi", cuisineName: "Japanese" })
    expect(rec.data).toEqual({
      description: "tasty", difficulty: "advanced", authenticIngredients: ["1 cup rice"], instructions: ["Step 1"]
    })
    const alias = await call("POST", "/api/ai/generate-cultural-recipe-details", { recipeName: "Sushi", cuisine: { name: "Japanese" } })
    expect(alias.data.difficulty).toBe("advanced")

    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({
      description: "d", keyIngredients: ["1. rice", "fish"], cookingTechniques: "- grill\n* steam"
    })
    const cu = await call("POST", "/api/ai/generate-cultural-recipe", { recipeName: "Thai", cuisineName: "Thai" })
    expect(cu.data.keyIngredients).toBe("1. rice\nfish")
    expect(cu.data.cookingTechniques).toBe("grill\nsteam")

    expect((await call("POST", "/api/ai/generate-cultural-recipe", { recipeName: "", cuisineName: "x" })).status).toBe(400)
  })
})
