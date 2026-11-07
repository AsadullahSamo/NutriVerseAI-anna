import { route, HttpError, reply } from "../router"
import { db } from "../db"
import { aiJson } from "../ai"

async function generateAIMealPlan(preferences, days = 7, dietaryRestrictions, calorieTarget) {
  const prompt = `Create a detailed ${days}-day meal plan with these specifications:
Preferences: ${(preferences || []).join(", ")}
${
  Array.isArray(dietaryRestrictions) && dietaryRestrictions.length
    ? `Dietary Restrictions: ${dietaryRestrictions.join(", ")}`
    : ""
}
${calorieTarget ? `Daily Calorie Target: ${calorieTarget} calories` : ""}

Return the meal plan as a JSON array where each day object has this structure:
{
  "day": number,
  "meals": {
    "breakfast": {
      "title": string,
      "description": string,
      "nutritionalInfo": string (format: "X kcal, Xg protein, Xg carbs, Xg fat"),
      "preparationTime": string
    },
    "lunch": { same as breakfast },
    "dinner": { same as breakfast },
    "snacks": [{
      "title": string,
      "description": string,
      "nutritionalInfo": string
    }]
  },
  "totalCalories": number,
  "nutritionSummary": string
}`
  const plan = await aiJson({ prompt, maxTokens: 4096 })
  const meals = Array.isArray(plan) ? plan : plan?.meals || plan?.days || plan?.mealPlan
  if (!Array.isArray(meals)) throw new HttpError(502, "The AI returned a meal plan in an unexpected format. Please try again.")
  return meals
}

const validDate = v => v && !isNaN(new Date(v).getTime())

route("GET", "/api/meal-plans", async () => {
  const plans = await db.list("mealPlans")
  return plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id)
})

route("POST", "/api/meal-plans", async ({ body, userId }) => {
  const { title, startDate, endDate, preferences, dietaryRestrictions, calorieTarget, days } = body
  if (typeof title !== "string" || !title.trim()) throw new HttpError(400, "Title is required")
  if (!validDate(startDate) || !validDate(endDate)) throw new HttpError(400, "Valid start and end dates are required")
  if (days && days > 7) throw new HttpError(400, "Meal plans cannot exceed 7 days")
  const meals = await generateAIMealPlan(preferences || [], days, dietaryRestrictions, calorieTarget)
  const plan = await db.insert("mealPlans", {
    userId,
    title,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    preferences: preferences ?? null,
    meals,
    isActive: true
  })
  return reply(201, plan)
})

route("PATCH", "/api/meal-plans/:id", async ({ params, body }) => {
  const { id: _id, ...patch } = body || {}
  for (const k of ["startDate", "endDate"]) {
    if (patch[k] !== undefined) {
      if (!validDate(patch[k])) throw new HttpError(400, `Invalid ${k}`)
      patch[k] = new Date(patch[k]).toISOString()
    }
  }
  const plan = await db.update("mealPlans", params.id, patch)
  if (!plan) throw new HttpError(404, "Meal plan not found")
  return plan
})

route("DELETE", "/api/meal-plans/:id", async ({ params }) => {
  await db.remove("mealPlans", params.id)
  return reply(204)
})

route("POST", "/api/ai/meal-plan", async ({ body }) => {
  const { preferences, days, dietaryRestrictions, calorieTarget } = body
  if (!Array.isArray(preferences)) {
    throw new HttpError(400, "Preferences array is required", { error: "Preferences array is required" })
  }
  if (days && days > 7) {
    throw new HttpError(400, "Meal plans cannot exceed 7 days", { error: "Meal plans cannot exceed 7 days" })
  }
  try {
    return await generateAIMealPlan(preferences, days, dietaryRestrictions, calorieTarget)
  } catch (e) {
    throw new HttpError(e.status || 500, e.message, { error: "Failed to generate meal plan" })
  }
})
