import { describe, it, expect, beforeEach } from "vitest"
import { dispatch } from "../src/anna/router"
import { db } from "../src/anna/db"
import "../src/anna/handlers/recipes"
import "../src/anna/handlers/recommendations"

const recipeBody = (title = "Test Soup") => ({
  title,
  description: "warm",
  ingredients: [{ item: "water", amount: "1 cup" }],
  instructions: ["boil"],
  nutritionInfo: { calories: 100, protein: 10, carbs: 5, fat: 2 },
  prepTime: 15
})

const create = async title => (await dispatch("POST", "/api/recipes", "", recipeBody(title))).data

beforeEach(() => {
  globalThis.__NVA_AI_MOCK = undefined
})

describe("recipes", () => {
  it("creates and lists recipes", async () => {
    const r = await dispatch("POST", "/api/recipes", "", recipeBody("Create A"))
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ title: "Create A", likes: 0, forkedFrom: null, sustainabilityScore: 50 })
    const list = await dispatch("GET", "/api/recipes", "")
    expect(list.data.some(x => x.id === r.data.id && x.likes === 0)).toBe(true)
  })

  it("rejects invalid recipe", async () => {
    const r = await dispatch("POST", "/api/recipes", "", { description: "x" })
    expect(r.status).toBe(400)
    expect(r.data.message).toMatch(/title/)
  })

  it("patches and 404s", async () => {
    const r = await create("Patch A")
    const p = await dispatch("PATCH", `/api/recipes/${r.id}`, "", { title: "Patched" })
    expect(p.data.title).toBe("Patched")
    expect((await dispatch("PATCH", "/api/recipes/99999", "", {})).status).toBe(404)
  })

  it("toggles likes", async () => {
    const r = await create("Like A")
    expect((await dispatch("GET", `/api/recipes/${r.id}/liked`, "")).data).toEqual({ hasLiked: false })
    expect((await dispatch("POST", `/api/recipes/${r.id}/like`, "")).data.likes).toBe(1)
    expect((await dispatch("GET", `/api/recipes/${r.id}/liked`, "")).data).toEqual({ hasLiked: true })
    expect((await dispatch("POST", `/api/recipes/${r.id}/like`, "")).data.likes).toBe(0)
    expect((await dispatch("POST", "/api/recipes/99999/like", "")).status).toBe(404)
  })

  it("forks a recipe", async () => {
    const r = await create("Fork A")
    const f = await dispatch("POST", `/api/recipes/${r.id}/fork`, "")
    expect(f.data).toMatchObject({ title: "Fork A (Fork)", forkedFrom: r.id, likes: 0 })
    expect(f.data.id).not.toBe(r.id)
  })

  it("consumes, lists history, and deletes consumption", async () => {
    const r = await create("Eat A")
    await db.insert("nutritionGoals", { userId: 1, isActive: true, progress: [] })
    const c = await dispatch("POST", `/api/recipes/${r.id}/consume`, "", { servings: 2, mealType: "lunch" })
    expect(c.data).toMatchObject({ recipeId: r.id, servings: 2, mealType: "lunch", userId: 1 })
    const goal = (await db.where("nutritionGoals", g => g.isActive))[0]
    expect(goal.progress[0]).toMatchObject({ calories: 200, protein: 20 })

    const h = await dispatch("GET", "/api/recipes/consumption-history", "mealType=lunch")
    const mine = h.data.find(x => x.recipeId === r.id)
    expect(mine.recipe.title).toBe("Eat A")
    const none = await dispatch("GET", "/api/recipes/consumption-history", "mealType=dinner")
    expect(none.data.find(x => x.recipeId === r.id)).toBeUndefined()
    const future = await dispatch("GET", "/api/recipes/consumption-history", "startDate=2999-01-01T00:00:00Z")
    expect(future.data).toEqual([])

    expect((await dispatch("DELETE", `/api/recipes/${r.id}/consumption`, "")).status).toBe(204)
    const after = await dispatch("GET", "/api/recipes/consumption-history", "")
    expect(after.data.find(x => x.recipeId === r.id)).toBeUndefined()
    expect((await dispatch("POST", "/api/recipes/99999/consume", "", {})).status).toBe(404)
  })

  it("deletes a recipe and its dependents", async () => {
    const r = await create("Del A")
    const f = (await dispatch("POST", `/api/recipes/${r.id}/fork`, "")).data
    await dispatch("POST", `/api/recipes/${r.id}/like`, "")
    await dispatch("POST", `/api/recipes/${r.id}/consume`, "", {})
    expect((await dispatch("DELETE", `/api/recipes/${r.id}`, "")).status).toBe(204)
    expect(await db.get("recipes", r.id)).toBeNull()
    expect((await db.get("recipes", f.id)).forkedFrom).toBeNull()
    expect(await db.where("recipeLikes", l => l.recipeId === r.id)).toEqual([])
    expect(await db.where("recipeConsumption", c => c.recipeId === r.id)).toEqual([])
    expect((await dispatch("DELETE", `/api/recipes/${r.id}`, "")).status).toBe(404)
  })
})

describe("AI recipe endpoints", () => {
  it("generates recipe details", async () => {
    const details = { description: "d", ingredients: [], instructions: ["a"], nutritionInfo: {}, prepTime: 5 }
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify(details)
    const r = await dispatch("POST", "/api/ai/generate-recipe", "", { title: "Pasta" })
    expect(r).toEqual({ status: 200, data: details })
    expect((await dispatch("POST", "/api/ai/generate-recipe", "", {})).status).toBe(400)
  })

  it("returns recipe recommendations", async () => {
    const recs = [{ title: "A", ingredients: [], instructions: [], nutritionalValue: "" }]
    globalThis.__NVA_AI_MOCK = async ({ prompt }) => {
      expect(prompt).toContain("rice")
      return "```json\n" + JSON.stringify(recs) + "\n```"
    }
    const r = await dispatch("POST", "/api/ai/recipe-recommendations", "", { ingredients: ["rice"] })
    expect(r.data).toEqual(recs)
    expect((await dispatch("POST", "/api/ai/recipe-recommendations", "", {})).status).toBe(400)
  })
})

describe("recommendations", () => {
  const rec = (title, priority) => ({
    title, description: "d", ingredients: ["x"], instructions: ["y"],
    nutritionInfo: { calories: 1, protein: 1, carbs: 1, fat: 1 }, prepTime: 5,
    explanation: "because", priority
  })

  it("returns personalized recommendations sorted by priority", async () => {
    await create("Seed recipe")
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify([rec("Low", 3), rec("High", 9)])
    const r = await dispatch("GET", "/api/recipes/personalized", "")
    expect(r.status).toBe(200)
    expect(r.data.recommendations).toHaveLength(2)
    expect(r.data.recommendations[0]).toMatchObject({
      matchScore: 90, reasonForRecommendation: "because", seasonalRelevance: false,
      recommendationId: r.data.recommendations[0].id
    })
    expect(r.data.recommendations[0].recipeData.title).toBe("High")
  })

  it("rejects malformed AI recipes", async () => {
    await create("Seed recipe 2")
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify([{ title: "bad" }])
    const r = await dispatch("GET", "/api/recipes/personalized", "")
    expect(r.status).toBe(500)
    expect(r.data.message).toMatch(/Invalid recipe format/)
  })

  it("records feedback", async () => {
    const r = await dispatch("POST", "/api/recipes/recommendations/-1000/feedback", "", {
      rating: 4, feedback: "nice", wasCooked: true
    })
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ recommendationId: -1000, rating: 4, wasCooked: true, wasSaved: false, userId: 1 })
  })

  it("refreshes recommendations", async () => {
    await create("Seed recipe 3")
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify([rec("One", 5)])
    const r = await dispatch("POST", "/api/recipes/recommendations/refresh", "")
    expect(r.data).toEqual({ message: "Recommendations refreshed successfully", count: 1 })
  })
})
