// Kitchen equipment: CRUD plus AI endpoints (ported from routes.ts 901-1071,
// ai-services/kitchen-ai.js and kitchen-inventory-ai.ts).
import { route, HttpError, reply } from "../router"
import { db, now } from "../db"
import { aiJson } from "../ai"

const COLL = "kitchenEquipment"

function fail(label, e) {
  const message = e?.message || label
  return new HttpError(e?.status || 500, message, { error: label })
}

async function ai(label, opts) {
  try {
    return await aiJson(opts)
  } catch (e) {
    throw fail(label, e)
  }
}

// ---------------- CRUD ----------------

route("GET", "/api/kitchen-equipment", async ({ userId }) => {
  return await db.where(COLL, r => r.userId === userId)
})

route("POST", "/api/kitchen-equipment", async ({ body, userId }) => {
  const t = now()
  const { id, ...rest } = body || {}
  return await db.insert(COLL, { ...rest, userId, createdAt: t, updatedAt: t })
})

route("DELETE", "/api/kitchen-equipment/:id", async ({ params }) => {
  await db.remove(COLL, params.id)
  return { success: true }
})

route("POST", "/api/kitchen-equipment/:id/maintenance", async ({ params, body }) => {
  const updated = await db.update(COLL, params.id, {
    lastMaintenanceDate: body?.maintenanceDate,
    maintenanceNotes: body?.notes,
    updatedAt: now()
  })
  if (!updated) throw new HttpError(404, "Equipment not found", { error: "Failed to update maintenance" })
  return updated
})

// ---------------- AI: recommendations ----------------

route("POST", "/api/kitchen-equipment/recommendations", async ({ body }) => {
  const { currentEquipment, cookingPreferences, budget } = body
  const prefs = Array.isArray(cookingPreferences) ? cookingPreferences.join(", ") : ""
  const prompt = `Based on this kitchen equipment inventory and cooking preferences, recommend essential equipment additions:
    Current Equipment: ${JSON.stringify(currentEquipment ?? [])}
    Cooking Preferences: ${prefs}
    ${budget ? `Budget Limit: $${budget}` : ""}

    Return recommendations in JSON array format with name, category, reason, priority, estimatedPrice, and optional alternativeOptions fields.`
  return await ai("Failed to generate equipment recommendations", { prompt, maxTokens: 2048 })
})

// ---------------- AI: recipe matches ----------------

route("POST", "/api/kitchen-equipment/recipe-matches", async ({ body }) => {
  const { equipment, userPreferences } = body
  const list = Array.isArray(equipment) ? equipment : []
  const saved = (await db.list("recipes")).slice(0, 30).map(r => ({
    id: r.id,
    title: r.title,
    ingredients: r.ingredients,
    instructions: r.instructions,
    prepTime: r.prepTime,
    difficulty: r.difficulty
  }))
  const prompt = `You are a culinary expert analyzing what recipes can be made with ONLY the current kitchen equipment.

CURRENT EQUIPMENT: ${JSON.stringify(list)}
USER PREFERENCES: ${Array.isArray(userPreferences) && userPreferences.length ? userPreferences.join(", ") : "None"}
${saved.length ? `USER'S SAVED RECIPES (consider these too, using their real ids): ${JSON.stringify(saved)}\n` : ""}
IMPORTANT RULES:
1. ONLY suggest recipes that can be made with the EXACT equipment listed above
2. If equipment is missing for a recipe, clearly indicate what's missing
3. Categorize recipes as "canMake" (with current equipment) or "needsEquipment" (missing equipment)
4. Be strict about equipment requirements - don't assume equipment that's not listed

Return EXACTLY this JSON structure with no additional text:
{
  "canMake": [
    {
      "id": number,
      "title": "string",
      "description": "Brief description",
      "ingredients": ["string"],
      "instructions": ["string"],
      "prepTime": number,
      "difficulty": "Easy|Medium|Hard",
      "requiredEquipment": ["equipment1", "equipment2"],
      "nutritionInfo": { "calories": number, "protein": number, "carbs": number, "fat": number, "sustainabilityScore": number }
    }
  ],
  "needsEquipment": [
    {
      "id": number,
      "title": "string",
      "description": "Brief description",
      "ingredients": ["string"],
      "instructions": ["string"],
      "prepTime": number,
      "difficulty": "Easy|Medium|Hard",
      "requiredEquipment": ["equipment1", "equipment2"],
      "missingEquipment": ["missing1", "missing2"],
      "nutritionInfo": { "calories": number, "protein": number, "carbs": number, "fat": number, "sustainabilityScore": number }
    }
  ]
}

Focus on practical, achievable recipes. Be very strict about equipment requirements.`
  const result = await ai("Failed to generate recipe matches", { prompt, maxTokens: 4096 })
  if (!result || (!result.canMake && !result.needsEquipment)) {
    throw new HttpError(500, "Invalid AI response structure", { error: "Failed to generate recipe matches" })
  }
  return result
})

// ---------------- AI: maintenance tips ----------------

const CONDITION_CONTEXT = {
  excellent: "CONDITION FOCUS: Equipment is in excellent condition. Provide preventive maintenance tips to keep it that way.",
  good: "CONDITION FOCUS: Equipment is in good condition. Provide maintenance tips to prevent deterioration and maintain performance.",
  fair: "CONDITION FOCUS: Equipment is in fair condition with some wear. Provide maintenance tips to prevent further deterioration and restore performance where possible.",
  "needs-maintenance": "CONDITION FOCUS: Equipment needs maintenance. Provide specific repair and restoration tips to improve its condition.",
  replace: "CONDITION FOCUS: Equipment is in poor condition and may need replacement. Provide tips for safe usage until replacement and signs to watch for immediate replacement."
}
const UNKNOWN_CONTEXT =
  "CONDITION FOCUS: Equipment condition is unknown. Provide general maintenance tips covering inspection, cleaning, and preventive care."

function fallbackTips(equipment) {
  const name = equipment.name || "equipment"
  const lower = name.toLowerCase()
  const category = (equipment.category || "").toLowerCase()
  const condition = (equipment.condition || "").toLowerCase()
  if (condition === "replace") {
    return [
      "Use with caution - equipment may be unsafe or ineffective",
      "Plan for immediate replacement",
      "Monitor closely for any safety issues",
      "Consider temporary alternatives until replacement"
    ]
  }
  let base
  if (lower.includes("knife") || category.includes("cutlery")) {
    base = [
      `Keep your ${name} sharp with regular honing`,
      "Hand wash immediately after use and dry thoroughly",
      "Store in a knife block or magnetic strip to protect the blade",
      "Never put in dishwasher as it can damage the blade"
    ]
  } else if (lower.includes("pan") || lower.includes("pot") || category.includes("cookware")) {
    base = [
      "Clean while still warm but not hot to prevent warping",
      "Avoid using metal utensils on non-stick surfaces",
      "Store with pan protectors to prevent scratching",
      "Check handles and rivets regularly for looseness"
    ]
  } else if (category.includes("appliance")) {
    base = [
      "Clean regularly according to manufacturer instructions",
      "Check power cord and plug for damage monthly",
      "Keep vents and air passages clear of debris",
      "Store in a dry location when not in use"
    ]
  } else {
    base = [
      `Clean your ${name} thoroughly after each use`,
      "Store in a clean, dry place to prevent deterioration",
      "Follow manufacturer's care instructions when available",
      "Inspect for wear and damage regularly"
    ]
  }
  if (condition === "needs-maintenance") {
    return ["Perform thorough cleaning and inspection", "Address any visible damage or wear immediately", ...base.slice(0, 2)]
  }
  if (condition === "fair") return [...base, "Address any visible wear or damage promptly"]
  return base
}

route("POST", "/api/kitchen-equipment/maintenance-tips", async ({ body }) => {
  const equipment = body?.equipment
  if (!equipment) {
    throw new HttpError(500, "Equipment is required", { error: "Failed to generate maintenance tips" })
  }
  const context = CONDITION_CONTEXT[(equipment.condition || "").toLowerCase()] || UNKNOWN_CONTEXT
  const prompt = `You are a kitchen equipment maintenance expert. Provide 4-5 specific maintenance tips for this equipment:

Equipment: ${equipment.name}
Category: ${equipment.category || "General"}
Current Condition: ${equipment.condition || "Unknown"}

${context}

Return ONLY a JSON array of strings. Each string should be a specific, actionable maintenance tip.
Example: ["Clean after each use", "Check for wear monthly", "Store in dry place"]

Focus on practical, equipment-specific advice tailored to the current condition. No explanations, just the JSON array.`
  try {
    const tips = await aiJson({ prompt, maxTokens: 1024 })
    if (Array.isArray(tips)) {
      const valid = tips.filter(t => typeof t === "string" && t.trim()).map(t => t.trim())
      if (valid.length) return valid
    }
  } catch (e) {
    // quota/permission/no-host errors should be visible; anything else falls back like the original
    if ([403, 429, 503].includes(e?.status)) throw fail("Failed to generate maintenance tips", e)
  }
  return fallbackTips(equipment)
})

// ---------------- AI: maintenance schedule ----------------

route("POST", "/api/kitchen-equipment/maintenance-schedule", async ({ body }) => {
  const { equipment, startDate, endDate } = body
  if (!equipment || !Array.isArray(equipment)) {
    throw new HttpError(400, "Equipment array is required", { error: "Equipment array is required" })
  }
  const prompt = `Create a maintenance schedule for these kitchen equipment items from ${startDate} to ${endDate}:
    Equipment: ${JSON.stringify(equipment)}

    Return a schedule in JSON array format with equipmentId, nextMaintenanceDate, tasks, estimatedDuration, and priority fields.
    Consider the current condition and last maintenance date of each item.`
  return await ai("Failed to generate maintenance schedule", { prompt, maxTokens: 3072 })
})

// ---------------- AI: analysis ----------------

route("POST", "/api/kitchen-equipment/analysis", async ({ body }) => {
  const { equipment, userPreferences } = body
  const prompt = `Analyze this kitchen equipment inventory and provide maintenance recommendations, shopping suggestions, and recipe possibilities:
    Equipment: ${JSON.stringify(equipment ?? [])}
    Cooking Preferences: ${(Array.isArray(userPreferences) && userPreferences.join(", ")) || "None specified"}

    Return analysis in JSON format with maintenanceRecommendations, shoppingRecommendations, and recipeRecommendations.`
  return await ai("Failed to generate kitchen analysis", { prompt, maxTokens: 3072 })
})
