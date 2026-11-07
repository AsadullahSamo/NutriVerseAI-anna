import { route, HttpError, reply } from "../router"
import { db } from "../db"
import { aiJson } from "../ai"

const getCurrentGoal = async userId =>
  db.find("nutritionGoals", g => g.userId === userId && g.isActive === true)

async function getNutritionRecommendations(currentGoals, progress, preferences, recent) {
  const prompt = `Based on these nutrition goals and progress, provide personalized recommendations:

Current Goals:
${JSON.stringify(currentGoals, null, 2)}

Progress:
${JSON.stringify(progress, null, 2)}

${preferences ? `Preferences: ${preferences.join(", ")}` : ""}
${recent.length ? `\nRecently eaten meals:\n${recent.join("\n")}\n` : ""}
Return recommendations in this JSON format:
{
  "analysis": string (overall analysis of progress),
  "suggestedGoals": {"calories": number, "protein": number, "carbs": number, "fat": number},
  "reasoning": string (explanation for suggested goals),
  "mealSuggestions": [{"type": string, "suggestions": [string]}],
  "improvements": [string] (specific areas to improve)
}`
  return aiJson({ prompt, maxTokens: 2048 })
}

route("GET", "/api/nutrition-goals/current", async ({ userId }) => {
  return (await getCurrentGoal(userId)) || null
})

route("POST", "/api/nutrition-goals", async ({ body, userId }) => {
  const nums = {}
  for (const k of ["dailyCalories", "dailyProtein", "dailyCarbs", "dailyFat"]) {
    const n = Number(body[k])
    if (body[k] === undefined || body[k] === null || body[k] === "" || !Number.isFinite(n)) {
      throw new HttpError(400, `${k} is required and must be a number`)
    }
    nums[k] = Math.round(n)
  }
  await db.where("nutritionGoals", g => g.userId === userId && g.isActive).then(async rows => {
    for (const g of rows) await db.update("nutritionGoals", g.id, { isActive: false })
  })
  const goal = await db.insert("nutritionGoals", {
    ...nums,
    userId,
    isActive: body.isActive ?? true,
    progress: Array.isArray(body.progress) ? body.progress : []
  })
  return reply(201, goal)
})

// The UI posts a single day's entry ({date, calories, ...}) without a goalId;
// the original replaced the progress column. We upsert by date into the array
// (a posted array replaces it), targeting goalId or else the active goal.
route("POST", "/api/nutrition-goals/progress", async ({ body, userId }) => {
  const { goalId, progress } = body
  const goal = goalId != null ? await db.get("nutritionGoals", goalId) : await getCurrentGoal(userId)
  if (!goal) throw new HttpError(404, "No active nutrition goal")
  let next
  if (Array.isArray(progress)) next = progress
  else if (progress && typeof progress === "object") {
    next = [...(goal.progress || [])]
    const i = next.findIndex(p => p.date === progress.date)
    if (i >= 0) next[i] = progress
    else next.push(progress)
  } else throw new HttpError(400, "progress is required")
  return db.update("nutritionGoals", goal.id, { progress: next })
})

route("GET", "/api/nutrition-goals/progress/today", async ({ userId }) => {
  const goal = await getCurrentGoal(userId)
  if (!goal) throw new HttpError(404, "No active nutrition goal")
  const today = new Date().toISOString().split("T")[0]
  return (
    (goal.progress || []).find(p => p.date === today) || {
      date: today,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      completed: false
    }
  )
})

route("GET", "/api/nutrition-goals/insights", async ({ userId }) => {
  const goal = await getCurrentGoal(userId)
  if (!goal) throw new HttpError(404, "No active nutrition goal")
  const prefs = await db.getDoc("preferences", null)
  const preferences = prefs?.dietaryPreferences || []

  // Join recent consumption with recipes (as getRecipeConsumptionWithDetails did).
  const consumption = (await db.where("recipeConsumption", c => c.userId === userId))
    .sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt))
    .slice(0, 10)
  const recipes = await db.list("recipes")
  const recent = consumption.map(c => {
    const r = recipes.find(x => x.id === c.recipeId)
    return `${String(c.consumedAt).slice(0, 10)} ${c.mealType || "meal"}: ${r?.title || "Unknown recipe"} x${c.servings ?? 1}`
  })

  return getNutritionRecommendations(
    {
      calories: goal.dailyCalories,
      protein: goal.dailyProtein,
      carbs: goal.dailyCarbs,
      fat: goal.dailyFat
    },
    goal.progress || [],
    preferences,
    recent
  )
})
