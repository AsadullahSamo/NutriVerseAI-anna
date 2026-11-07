import { route, HttpError, reply } from "../router"
import { db } from "../db"
import { aiJson } from "../ai"

function toIso(v) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) throw new HttpError(400, "Invalid expiry date")
  return d.toISOString()
}

function validate(body) {
  if (typeof body.name !== "string" || !body.name.trim()) throw new HttpError(400, "Name is required")
  if (body.quantity === undefined || body.quantity === null || String(body.quantity) === "") {
    throw new HttpError(400, "Quantity is required")
  }
  if (body.sustainabilityScore !== undefined && body.sustainabilityScore !== null) {
    const s = Number(body.sustainabilityScore)
    if (isNaN(s) || s < 0 || s > 100) throw new HttpError(400, "Sustainability score must be between 0 and 100")
  }
}

// The original table required these two objects, and pages read their fields
// without guards, so fill in defaults whenever they are missing.
const DEFAULT_NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0 }
const DEFAULT_SUSTAINABILITY = { score: 0, packaging: "recyclable", carbonFootprint: "low" }

function withDefaults(item) {
  return {
    ...item,
    nutritionInfo: { ...DEFAULT_NUTRITION, ...(item.nutritionInfo || {}) },
    sustainabilityInfo: { ...DEFAULT_SUSTAINABILITY, ...(item.sustainabilityInfo || {}) }
  }
}

async function createItem(body, userId) {
  validate(body)
  const { id: _id, ...rest } = body
  const item = await db.insert("pantryItems", {
    ...withDefaults(rest),
    userId,
    expiryDate: toIso(body.expiryDate),
    category: body.category ?? null,
    image_url: body.image_url ?? null
  })
  return reply(201, item)
}

route("GET", "/api/pantry", async () => (await db.list("pantryItems")).map(withDefaults))
route("POST", "/api/pantry", ({ body, userId }) => createItem(body, userId))
route("POST", "/api/pantryItems", ({ body, userId }) => createItem(body, userId))

route("PATCH", "/api/pantry/:id", async ({ params, body }) => {
  const { id: _id, ...rest } = body || {}
  const item = await db.update("pantryItems", params.id, {
    ...rest,
    ...(rest.nutritionInfo !== undefined ? { nutritionInfo: { ...DEFAULT_NUTRITION, ...(rest.nutritionInfo || {}) } } : {}),
    ...(rest.sustainabilityInfo !== undefined ? { sustainabilityInfo: { ...DEFAULT_SUSTAINABILITY, ...(rest.sustainabilityInfo || {}) } } : {}),
    expiryDate: toIso(body.expiryDate),
    image_url: body.image_url ?? null
  })
  if (!item) throw new HttpError(404, "Pantry item not found")
  return withDefaults(item)
})

route("DELETE", "/api/pantry/:id", async ({ params }) => {
  if (isNaN(parseInt(params.id))) throw new HttpError(400, "Invalid item ID", { error: "Invalid item ID" })
  await db.remove("pantryItems", params.id)
  return reply(204)
})

route("POST", "/api/ai/generate-pantry-item", async ({ body }) => {
  const { itemName, category } = body
  if (!itemName) throw new HttpError(400, "Item name is required", { error: "Item name is required" })
  const prompt = `Generate detailed pantry item information for "${itemName}"${
    category ? ` in the category ${category}` : ""
  }.

    Return EXACTLY this JSON structure with no additional text:
    {
      "name": "string (just the item name)",
      "category": "string (e.g., Dairy, Produce, Grains, etc.)",
      "quantity": "string (standard quantity unit e.g., '1 lb', '500g', '1 container')",
      "expiryDays": number (typical shelf life in days from purchase),
      "nutritionInfo": {
        "calories": number,
        "protein": number (in grams),
        "carbs": number (in grams),
        "fat": number (in grams)
      },
      "sustainabilityInfo": {
        "packaging": "string (one of: 'recyclable', 'biodegradable', 'reusable', 'non-recyclable')",
        "carbonFootprint": "string (one of: 'low', 'medium', 'high')"
      }
    }`
  try {
    return await aiJson({ prompt })
  } catch (e) {
    throw new HttpError(e.status || 500, e.message || "Failed to generate pantry item details", {
      error: "Failed to generate pantry item details"
    })
  }
})
