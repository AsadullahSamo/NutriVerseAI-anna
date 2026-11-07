// Personalized recipe recommendations (AI generated from the user's own
// recipes) and feedback on them.
import { route, HttpError, reply } from "../router"
import { db } from "../db"
import { aiJson } from "../ai"

function currentSeason() {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return "spring"
  if (m >= 6 && m <= 8) return "summer"
  if (m >= 9 && m <= 11) return "fall"
  return "winter"
}

// Preferences singleton shape is owned elsewhere; pull out whatever string lists we can.
async function loadPreferenceStrings() {
  const prefs = await db.getDoc("preferences", null)
  if (!prefs || typeof prefs !== "object") return []
  const out = []
  for (const key of ["dietaryPreferences", "dietary", "preferences", "cuisinePreferences", "allergies"]) {
    if (Array.isArray(prefs[key])) out.push(...prefs[key].filter(x => typeof x === "string"))
  }
  return out
}

async function generateRecommendations() {
  const userId = 1
  const recipes = await db.list("recipes")
  if (recipes.length === 0) return []

  const [prefs, pantry, history, feedback, goals] = await Promise.all([
    loadPreferenceStrings(),
    db.list("pantryItems"),
    db.list("recipeConsumption"),
    db.list("recommendationFeedback"),
    db.where("nutritionGoals", g => g.isActive)
  ])
  const goal = goals[0]
  const nutritionGoals = goal
    ? {
        dailyCalories: goal.dailyCalories ?? goal.daily_calories,
        dailyProtein: goal.dailyProtein ?? goal.daily_protein,
        dailyCarbs: goal.dailyCarbs ?? goal.daily_carbs,
        dailyFat: goal.dailyFat ?? goal.daily_fat
      }
    : null
  const pantryNames = pantry.map(p => p.name).filter(Boolean)
  const recentHistory = [...history]
    .sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt))
    .slice(0, 10)
    .map(c => recipes.find(r => String(r.id) === String(c.recipeId))?.title)
    .filter(Boolean)
  const recentFeedback = [...feedback]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map(f => `rating ${f.rating}${f.feedback ? `: ${f.feedback}` : ""}`)

  const prompt = `You are a creative recipe recommendation system. Your task is to generate NEW, UNIQUE recipes based on the user's preferences and the available recipes in our system.

User Profile:
- Dietary preferences: ${prefs.join(", ") || "none specified"}
- Nutrition goals: ${JSON.stringify(nutritionGoals) || "none specified"}
- Cooking skill level: intermediate
- Available pantry items: ${pantryNames.join(", ") || "none specified"}
- Current season: ${currentSeason()}
- Recently cooked: ${recentHistory.join(", ") || "nothing yet"}
- Past feedback on recommendations: ${recentFeedback.join("; ") || "none"}

AVAILABLE RECIPES IN OUR SYSTEM (for reference and inspiration):
${recipes.map(r => `Title: "${r.title}", Description: "${r.description}"`).join("\n")}

REQUIREMENTS:
1. Generate 3 NEW, UNIQUE recipes that would be a good match for this user
2. These should be COMPLETELY NEW recipes, not just modifications of existing ones
3. Each recipe should be inspired by the available recipes but tailored to the user's specific needs
4. For each recipe, provide:
   - A unique, creative title
   - A detailed description
   - A list of ingredients with quantities (each ingredient must be a separate string in the array)
   - Step-by-step cooking instructions (each step must be a separate string in the array)
   - Nutrition information (calories, protein, carbs, fat)
   - Prep time in minutes
   - A detailed explanation of why this recipe is a good match for this user
   - A priority score (1-10) based on how well it matches the user's preferences

IMPORTANT: Your response must be a valid JSON array with proper formatting. Each ingredient and instruction must be a separate string in their respective arrays. DO NOT include any markdown formatting.

Your response must be a JSON array:
[
  {
    "title": string,
    "description": string,
    "ingredients": string[],
    "instructions": string[],
    "nutritionInfo": { "calories": number, "protein": number, "carbs": number, "fat": number },
    "prepTime": number,
    "explanation": string,
    "priority": number
  }
]`

  let list
  try {
    list = await aiJson({ prompt, maxTokens: 3000, temperature: 0.7 })
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(500, "Failed to generate valid recipe recommendations", {
      error: "Failed to get personalized recommendations",
      details: e.message
    })
  }
  if (!Array.isArray(list)) list = Array.isArray(list?.recipes) ? list.recipes : []
  list.forEach((r, i) => {
    if (
      !r || !r.title || !r.description || !Array.isArray(r.ingredients) ||
      !Array.isArray(r.instructions) || !r.nutritionInfo || !r.prepTime ||
      !r.explanation || typeof r.priority !== "number"
    ) {
      throw new HttpError(500, `Invalid recipe format at index ${i}`, {
        error: "Failed to get personalized recommendations",
        details: `Invalid recipe format at index ${i}`
      })
    }
  })
  list.sort((a, b) => b.priority - a.priority)
  return list.map((recipe, index) => ({
    id: -1000 - index, // negative ids mark AI-generated, unsaved recommendations
    recommendationId: -1000 - index,
    matchScore: recipe.priority * 10,
    reasonForRecommendation: recipe.explanation,
    seasonalRelevance: false,
    recipeData: recipe,
    isAiGenerated: true
  }))
}

route("GET", "/api/recipes/personalized", async () => {
  const recommendations = await generateRecommendations()
  const out = recommendations.map(r => ({
    id: r.id,
    recommendationId: r.id,
    matchScore: r.matchScore,
    reasonForRecommendation: r.reasonForRecommendation,
    seasonalRelevance: r.seasonalRelevance,
    recipeData: r.recipeData
  }))
  await db.setDoc("lastRecommendations", out)
  return { recommendations: out }
})

route("POST", "/api/recipes/recommendations/:id/feedback", async ({ params, body, userId }) => {
  const recommendationId = parseInt(params.id)
  const { rating, feedback, wasCooked, wasSaved, wasShared, cookingNotes, modifications,
    difficultyRating, timeAccuracy, tasteRating, healthinessRating } = body
  const record = await db.insert("recommendationFeedback", {
    userId,
    recommendationId,
    rating,
    feedback,
    wasCooked: wasCooked ?? false,
    wasSaved: wasSaved ?? false,
    wasShared: wasShared ?? false,
    cookingNotes,
    modifications,
    difficultyRating,
    timeAccuracy,
    tasteRating,
    healthinessRating
  })
  return reply(201, record)
})

route("POST", "/api/recipes/recommendations/refresh", async () => {
  const recommendations = await generateRecommendations()
  await db.setDoc("lastRecommendations", recommendations)
  return { message: "Recommendations refreshed successfully", count: recommendations.length }
})
