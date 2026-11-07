// Recipes: CRUD, likes (single-user toggle), forks, consumption tracking,
// and the AI helpers used by the recipe dialogs.
import { route, HttpError, reply } from "../router"
import { db, now } from "../db"
import { aiJson } from "../ai"

const num = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function likeCount(recipeId) {
  const likes = await db.where("recipeLikes", l => String(l.recipeId) === String(recipeId))
  return likes.length
}

async function withLikes(recipe) {
  return recipe ? { ...recipe, likes: await likeCount(recipe.id) } : recipe
}

async function requireRecipe(id) {
  const recipe = await db.get("recipes", id)
  if (!recipe) throw new HttpError(404, "Recipe not found")
  return recipe
}

route("GET", "/api/recipes", async () => {
  const [recipes, likes] = await Promise.all([db.list("recipes"), db.list("recipeLikes")])
  return recipes.map(r => ({
    ...r,
    likes: likes.filter(l => String(l.recipeId) === String(r.id)).length
  }))
})

route("POST", "/api/recipes", async ({ body, userId }) => {
  const errors = []
  if (typeof body.title !== "string" || !body.title.trim()) errors.push("title is required")
  if (body.ingredients === undefined || body.ingredients === null) errors.push("ingredients is required")
  if (body.instructions === undefined || body.instructions === null) errors.push("instructions is required")
  if (body.nutritionInfo === undefined || body.nutritionInfo === null) errors.push("nutritionInfo is required")
  if (errors.length) throw new HttpError(400, `Invalid recipe: ${errors.join(", ")}`)

  const { id: _id, likes: _likes, ...rest } = body
  const recipe = await db.insert("recipes", {
    ...rest,
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : "",
    prepTime: typeof body.prepTime === "number" ? body.prepTime : 0,
    sustainabilityScore: body.sustainabilityScore || 50,
    wastageReduction: body.wastageReduction ?? null,
    forkedFrom: null,
    createdBy: userId,
    createdAt: now()
  })
  return reply(201, { ...recipe, likes: 0 })
})

route("GET", "/api/recipes/consumption-history", async ({ query, userId }) => {
  const start = query.startDate ? new Date(query.startDate).getTime() : null
  const end = query.endDate ? new Date(query.endDate).getTime() : null
  const { mealType } = query
  const [rows, recipes] = await Promise.all([
    db.where("recipeConsumption", c => String(c.userId) === String(userId)),
    db.list("recipes")
  ])
  const byId = new Map(recipes.map(r => [String(r.id), r]))
  return rows
    .filter(c => {
      const t = new Date(c.consumedAt).getTime()
      if (start !== null && t < start) return false
      if (end !== null && t > end) return false
      if (mealType && mealType !== "all" && c.mealType !== mealType) return false
      return true
    })
    .sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt))
    .map(c => ({ ...c, recipe: byId.get(String(c.recipeId)) ?? null }))
})

route("PATCH", "/api/recipes/:id", async ({ params, body }) => {
  await requireRecipe(params.id)
  const { likes: _likes, id: _id, ...patch } = body
  return await withLikes(await db.update("recipes", params.id, patch))
})

route("DELETE", "/api/recipes/:id", async ({ params }) => {
  const recipe = await requireRecipe(params.id)
  // Mirror storage.deleteRecipe: detach forks, drop consumption and likes.
  const forks = await db.where("recipes", r => String(r.forkedFrom) === String(recipe.id))
  for (const f of forks) await db.update("recipes", f.id, { forkedFrom: null })
  await db.removeWhere("recipeConsumption", c => String(c.recipeId) === String(recipe.id))
  await db.removeWhere("recipeLikes", l => String(l.recipeId) === String(recipe.id))
  await db.remove("recipes", recipe.id)
  return reply(204)
})

route("DELETE", "/api/recipes/:id/consumption", async ({ params }) => {
  await db.removeWhere("recipeConsumption", c => String(c.recipeId) === String(params.id))
  return reply(204)
})

route("POST", "/api/recipes/:id/like", async ({ params, userId }) => {
  const recipe = await requireRecipe(params.id)
  const existing = await db.find(
    "recipeLikes",
    l => String(l.recipeId) === String(recipe.id) && String(l.userId) === String(userId)
  )
  if (existing) await db.remove("recipeLikes", existing.id)
  else await db.insert("recipeLikes", { recipeId: recipe.id, userId })
  return await withLikes(recipe)
})

route("GET", "/api/recipes/:id/liked", async ({ params, userId }) => {
  const hasLiked = !!(await db.find(
    "recipeLikes",
    l => String(l.recipeId) === String(params.id) && String(l.userId) === String(userId)
  ))
  return { hasLiked }
})

route("POST", "/api/recipes/:id/fork", async ({ params, userId }) => {
  const original = await requireRecipe(params.id)
  const { id: _id, likes: _likes, ...copy } = original
  const fork = await db.insert("recipes", {
    ...copy,
    title: `${original.title} (Fork)`,
    createdBy: userId,
    forkedFrom: original.id,
    createdAt: now()
  })
  return { ...fork, likes: 0 }
})

route("POST", "/api/recipes/:id/consume", async ({ params, body, userId }) => {
  const recipeId = parseInt(params.id)
  const servings = body.servings ?? 1
  const mealType = body.mealType ?? "snack"
  const consumption = await db.insert("recipeConsumption", {
    userId,
    recipeId,
    servings,
    mealType,
    consumedAt: now()
  })

  const recipe = await db.get("recipes", recipeId)
  if (!recipe) throw new HttpError(404, "Recipe not found")

  const goals = await db.where("nutritionGoals", g => String(g.userId) === String(userId) && g.isActive)
  const goal = goals[0]
  if (goal) {
    const today = new Date().toISOString().split("T")[0]
    const progress = Array.isArray(goal.progress) ? goal.progress : []
    const info = recipe.nutritionInfo || {}
    const scaled = {
      calories: num(info.calories) * servings,
      protein: num(info.protein) * servings,
      carbs: num(info.carbs) * servings,
      fat: num(info.fat) * servings
    }
    const next = progress.some(p => p.date === today)
      ? progress.map(p =>
          p.date === today
            ? {
                ...p,
                calories: num(p.calories) + scaled.calories,
                protein: num(p.protein) + scaled.protein,
                carbs: num(p.carbs) + scaled.carbs,
                fat: num(p.fat) + scaled.fat
              }
            : p
        )
      : [...progress, { date: today, ...scaled, completed: false }]
    await db.update("nutritionGoals", goal.id, { progress: next })
  }
  return consumption
})

route("POST", "/api/ai/generate-recipe", async ({ body }) => {
  const { title, cuisine, preferences } = body
  if (!title) throw new HttpError(400, "Recipe title is required", { error: "Recipe title is required" })
  const prompt = `Generate detailed recipe information for "${title}"${cuisine ? ` from ${cuisine} cuisine` : ""}.
    ${Array.isArray(preferences) && preferences.length ? `Consider these preferences: ${preferences.join(", ")}` : ""}

    Return EXACTLY this JSON structure with no additional text:
    {
      "description": "string (a short description of the recipe maybe 2 - 3 lines)",
      "ingredients": [
        { "item": "string", "amount": "string", "notes": "string (optional)" }
      ],
      "instructions": ["string"],
      "nutritionInfo": {
        "calories": number,
        "protein": number (in grams),
        "carbs": number (in grams),
        "fat": number (in grams)
      },
      "prepTime": number (in minutes),
      "cookingTips": ["string"],
      "substitutes": [
        { "ingredient": "string", "alternatives": ["string"] }
      ]
    }`
  try {
    return await aiJson({ prompt, maxTokens: 2048 })
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(500, e.message || "Failed to generate recipe details", {
      error: "Failed to generate recipe details"
    })
  }
})

route("POST", "/api/ai/recipe-recommendations", async ({ body }) => {
  const { ingredients, dietaryPreferences } = body
  if (!ingredients || !Array.isArray(ingredients)) {
    throw new HttpError(400, "Ingredients array is required", { error: "Ingredients array is required" })
  }
  const prompt = `You are a professional chef creating recipes. Please create 3 recipes using some or all of these ingredients: ${ingredients.join(", ")}
${Array.isArray(dietaryPreferences) && dietaryPreferences.length ? `Consider these dietary preferences: ${dietaryPreferences.join(", ")}\n` : ""}
IMPORTANT: Your response must be a valid JSON array containing EXACTLY 3 recipes. Each recipe must follow this format exactly:
{
  "title": "Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "nutritionalValue": "Calories: X, Protein: Xg, Carbs: Xg, Fat: Xg"
}`
  try {
    return await aiJson({ prompt, maxTokens: 2048 })
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(500, e.message || "Failed to generate recipe recommendations", {
      error: "Failed to generate recipe recommendations"
    })
  }
})
