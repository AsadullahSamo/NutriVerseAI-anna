import { describe, it, expect } from "vitest"
import { dispatch } from "../src/anna/router"
import { db } from "../src/anna/db"
import "../src/anna/handlers/nutrition"
import "../src/anna/handlers/mood"

describe("nutrition goals", () => {
  it("handles empty state and errors", async () => {
    expect((await dispatch("GET", "/api/nutrition-goals/current")).data).toBeNull()
    expect((await dispatch("GET", "/api/nutrition-goals/progress/today")).status).toBe(404)
    expect((await dispatch("GET", "/api/nutrition-goals/insights")).status).toBe(404)
    expect((await dispatch("POST", "/api/nutrition-goals", "", { dailyCalories: 2000 })).status).toBe(400)
  })

  it("creates, replaces, tracks progress, insights", async () => {
    const g = { dailyCalories: 2000, dailyProtein: 100, dailyCarbs: 250, dailyFat: 60, progress: [] }
    const a = await dispatch("POST", "/api/nutrition-goals", "", g)
    expect(a.status).toBe(201)
    const b = await dispatch("POST", "/api/nutrition-goals", "", { ...g, dailyCalories: 2200 })
    const cur = (await dispatch("GET", "/api/nutrition-goals/current")).data
    expect(cur.id).toBe(b.data.id)
    expect(cur.dailyCalories).toBe(2200)
    expect((await db.get("nutritionGoals", a.data.id)).isActive).toBe(false)

    let t = (await dispatch("GET", "/api/nutrition-goals/progress/today")).data
    expect(t.calories).toBe(0)
    const today = new Date().toISOString().split("T")[0]
    const p = { date: today, calories: 500, protein: 20, carbs: 50, fat: 10, completed: false }
    await dispatch("POST", "/api/nutrition-goals/progress", "", { progress: p })
    const r = await dispatch("POST", "/api/nutrition-goals/progress", "", { goalId: b.data.id, progress: { ...p, calories: 700 } })
    expect(r.data.progress).toHaveLength(1)
    t = (await dispatch("GET", "/api/nutrition-goals/progress/today")).data
    expect(t.calories).toBe(700)

    await db.insert("recipes", { title: "Soup" })
    await db.insert("recipeConsumption", { userId: 1, recipeId: 1, servings: 1, mealType: "lunch", consumedAt: new Date().toISOString() })
    let seen
    globalThis.__NVA_AI_MOCK = async ({ prompt }) => {
      seen = prompt
      return JSON.stringify({ analysis: "ok", suggestedGoals: { calories: 1, protein: 1, carbs: 1, fat: 1 }, reasoning: "r", mealSuggestions: [], improvements: [] })
    }
    const ins = await dispatch("GET", "/api/nutrition-goals/insights")
    expect(ins.data.suggestedGoals.calories).toBe(1)
    expect(seen).toContain("Soup")
  })
})

describe("mood journal", () => {
  it("adds, lists, insights, deletes", async () => {
    expect((await dispatch("GET", "/api/mood-journal/7/insights")).data.recommendations.title).toBe("Get Started")
    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({ sentiment: "positive", emotions: ["joy"] })
    const add = await dispatch("POST", "/api/mood-journal", "", { recipeId: 7, entry: "Loved it" })
    expect(add.status).toBe(200)
    await dispatch("POST", "/api/mood-journal", "", { recipeId: 8, entry: "Other" })
    expect((await dispatch("POST", "/api/mood-journal", "", { recipeId: 7, entry: " " })).status).toBe(400)
    const list = (await dispatch("GET", "/api/mood-journal/7")).data
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ recipeId: 7, sentiment: "positive", emotions: ["joy"] })

    globalThis.__NVA_AI_MOCK = async () => JSON.stringify({ summary: "S", patterns: [] })
    const ins = (await dispatch("GET", "/api/mood-journal/7/insights")).data
    expect(ins.summary).toBe("S")
    expect(ins.recommendations.title).toBe("Getting Started")

    const del = await dispatch("DELETE", `/api/mood-journal/7/${encodeURIComponent(list[0].timestamp)}`)
    expect(del.data.message).toBe("Entry deleted successfully")
    expect((await dispatch("GET", "/api/mood-journal/7")).data).toEqual([])
    expect((await dispatch("GET", "/api/mood-journal/8")).data).toHaveLength(1)
  })
})
