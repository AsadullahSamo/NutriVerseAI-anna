// Cultural cuisines, cultural recipes and their AI generation.
// Single user: "hide" just sets `hidden: true`; hidden items are not listed.
import { route, HttpError, reply } from "../router"
import { db, now } from "../db"
import { aiJson } from "../ai"

const CUISINES = "culturalCuisines"
const RECIPES = "culturalRecipes"
const TECHNIQUES = "culturalTechniques"

const bad = (status, message) => new HttpError(status, message, { error: message })

function parseJsonish(value, fallback, wantObject) {
  if (Array.isArray(value)) return wantObject ? fallback : value
  if (typeof value === "object" && value !== null) return wantObject ? value : fallback
  if (typeof value === "string" && !value.trim()) return fallback
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (wantObject ? parsed && typeof parsed === "object" && !Array.isArray(parsed) : Array.isArray(parsed)) return parsed
    } catch {}
    // Plain (non-JSON) strings are kept as written by the user or the AI.
    return value
  }
  return fallback
}

function processCuisine(c) {
  return {
    ...c,
    keyIngredients: parseJsonish(c.keyIngredients, [], false),
    cookingTechniques: parseJsonish(c.cookingTechniques, [], false),
    culturalContext: parseJsonish(c.culturalContext, {}, true),
    servingEtiquette: parseJsonish(c.servingEtiquette, {}, true)
  }
}

async function getCuisineOr404(id) {
  const cuisine = await db.get(CUISINES, id)
  if (!cuisine) throw bad(404, "Cuisine not found")
  return cuisine
}

async function getRecipeOr404(id) {
  const recipe = await db.get(RECIPES, id)
  if (!recipe) throw bad(404, "Recipe not found")
  return recipe
}

const normalizeName = value => {
  if (typeof value === "string") return value.trim()
  if (value && typeof value === "object") {
    if (typeof value.name === "string") return value.name.trim()
    if (typeof value.region === "string") return value.region.trim()
  }
  return ""
}

const regionKey = region =>
  String(region || "").toLowerCase().trim().replace(/[\s-]+/g, "_")

const unique = (...lists) => Array.from(new Set(lists.flat().filter(x => typeof x === "string")))

// ---------------------------------------------------------------- cuisines

route("GET", "/api/cultural-cuisines", async () => {
  const cuisines = await db.where(CUISINES, c => !c.hidden)
  return cuisines.map(processCuisine)
})

route("POST", "/api/cultural-cuisines", async ({ body, userId }) => {
  const { name, region, description, imageUrl, bannerUrl, keyIngredients, cookingTechniques, culturalContext, servingEtiquette } = body
  if (!name || !region) throw bad(400, "Name and region are required")
  const cuisine = await db.insert(CUISINES, {
    name,
    region,
    description: description || "",
    imageUrl: imageUrl || null,
    bannerUrl: bannerUrl || null,
    keyIngredients: keyIngredients || [],
    cookingTechniques: cookingTechniques || [],
    culturalContext: culturalContext || "",
    servingEtiquette: servingEtiquette || "",
    createdBy: userId,
    hiddenFor: [],
    hidden: false
  })
  return reply(201, cuisine)
})

route("GET", "/api/cultural-cuisines/:id", async ({ params }) => {
  const id = parseInt(params.id)
  if (isNaN(id)) throw bad(400, "Invalid cuisine ID")
  const cuisine = await getCuisineOr404(id)
  const recipes = await db.where(RECIPES, r => r.cuisineId === id && !r.hidden)
  const techniques = await db.where(TECHNIQUES, t => t.cuisineId === id)
  return { ...processCuisine(cuisine), recipes, techniques }
})

route("PATCH", "/api/cultural-cuisines/:id", async ({ params, body }) => {
  const { id: _ignore, ...rest } = body || {}
  const updated = await db.update(CUISINES, params.id, { ...rest, updatedAt: now() })
  if (!updated) throw bad(404, "Cuisine not found")
  return updated
})

route("DELETE", "/api/cultural-cuisines/:id", async ({ params }) => {
  const cuisine = await getCuisineOr404(params.id)
  await db.remove(CUISINES, cuisine.id)
  await db.removeWhere(RECIPES, r => r.cuisineId === cuisine.id)
  await db.removeWhere(TECHNIQUES, t => t.cuisineId === cuisine.id)
  return cuisine
})

route("POST", "/api/cultural-cuisines/:id/hide", async ({ params }) => {
  const id = parseInt(params.id)
  if (isNaN(id)) throw new HttpError(400, "Invalid cuisine ID", { type: "error" })
  const cuisine = await db.get(CUISINES, id)
  if (!cuisine) throw new HttpError(404, "Cuisine not found", { type: "error" })
  if (cuisine.hidden) throw new HttpError(400, "Content is already hidden for this user", { type: "error" })
  const updated = await db.update(CUISINES, id, { hidden: true })
  return { type: "hidden", cuisine: updated }
})

// ----------------------------------------------------------------- recipes

route("GET", "/api/cultural-recipes", async ({ query }) => {
  const cuisineId = query.cuisineId !== undefined ? parseInt(query.cuisineId) : null
  return db.where(RECIPES, r => !r.hidden && (cuisineId === null || r.cuisineId === cuisineId))
})

route("POST", "/api/cultural-recipes", async ({ body, userId }) => {
  const {
    name,
    description,
    cuisineId,
    difficulty = "beginner",
    authenticIngredients = [],
    localSubstitutes = {},
    instructions = [],
    culturalNotes = {},
    servingSuggestions = [],
    imageUrl = ""
  } = body
  if (!name || !description || !cuisineId) throw bad(400, "Missing required fields")
  const ts = now()
  const recipe = await db.insert(RECIPES, {
    name,
    description,
    cuisineId: Number(cuisineId),
    difficulty,
    authenticIngredients,
    localSubstitutes,
    instructions,
    culturalNotes,
    servingSuggestions,
    imageUrl,
    image_url: body.image_url || imageUrl || null,
    createdBy: userId,
    hiddenFor: [],
    hidden: false,
    updatedAt: ts,
    createdAt: ts
  })
  return reply(201, recipe)
})

route("GET", "/api/cultural-recipes/:id", async ({ params }) => getRecipeOr404(params.id))

route("GET", "/api/cultural-recipes/:id/pairings", async ({ params }) => {
  const recipe = await getRecipeOr404(params.id)
  const cuisine = await db.get(CUISINES, recipe.cuisineId)
  return getPairings(recipe, cuisine)
})

route("GET", "/api/cultural-recipes/:id/etiquette", async ({ params }) => {
  const recipe = await getRecipeOr404(params.id)
  const cuisine = await db.get(CUISINES, recipe.cuisineId)
  return getEtiquette(recipe, cuisine)
})

route("DELETE", "/api/cultural-recipes/:id", async ({ params }) => {
  const recipe = await getRecipeOr404(params.id)
  await db.remove(RECIPES, recipe.id)
  return recipe
})

route("POST", "/api/cultural-recipes/:id/hide", async ({ params }) => {
  const recipe = await db.get(RECIPES, params.id)
  if (!recipe) throw new HttpError(404, "Recipe not found", { type: "error" })
  if (recipe.hidden) throw new HttpError(400, "Content is already hidden for this user", { type: "error" })
  const updated = await db.update(RECIPES, recipe.id, { hidden: true })
  return { type: "hidden", recipe: updated }
})

route("PATCH", "/api/cultural-recipes/:id", async ({ params, body }) => {
  const { id: _ignore, ...rest } = body || {}
  const updated = await db.update(RECIPES, params.id, {
    ...rest,
    imageUrl: rest.imageUrl || null,
    updatedAt: now()
  })
  if (!updated) throw bad(404, "Recipe not found")
  return updated
})

route("GET", "/api/user-recipes", async () => {
  const rows = await db.list("recipes")
  rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    nutritionInfo: r.nutritionInfo,
    imageUrl: r.imageUrl,
    prepTime: r.prepTime,
    createdBy: r.createdBy,
    forkedFrom: r.forkedFrom,
    sustainabilityScore: r.sustainabilityScore,
    wastageReduction: r.wastageReduction,
    createdAt: r.createdAt
  }))
})

route("POST", "/api/cultural-cuisines/:cuisineId/recipes", async ({ params, body, userId }) => {
  const ts = now()
  const { id: _ignore, ...rest } = body || {}
  const recipe = await db.insert(RECIPES, {
    ...rest,
    cuisineId: parseInt(params.cuisineId),
    image_url: rest.image_url || null,
    createdBy: rest.createdBy || userId,
    hidden: false,
    createdAt: ts,
    updatedAt: ts
  })
  return recipe
})

// ------------------------------------------------------------ AI generation

async function generateCuisineDetailsFromName(name, region) {
  const prompt = `Generate detailed information about ${name} cuisine from ${region}.

For key ingredients and cooking techniques, put each item on a separate line WITHOUT any numbering, bullets, or other markers.

Include:
1. A detailed description (2-3 paragraphs) of ${name} cuisine
2. List of at least 6 key ingredients used in ${name} cuisine
3. List of at least 4 common cooking techniques used in ${name} cuisine
4. Cultural context including history, traditions, festivals, and influences
5. Serving etiquette including table settings, dining customs, serving order, and taboos

Your response MUST be structured exactly like this JSON:
{
  "description": "Comprehensive description of the cuisine covering its characteristics, flavors, and significance",
  "keyIngredients": "Ingredient 1\\nIngredient 2\\nIngredient 3\\nIngredient 4\\nIngredient 5\\nIngredient 6",
  "cookingTechniques": "Technique 1\\nTechnique 2\\nTechnique 3\\nTechnique 4",
  "culturalContext": {
    "history": "Detailed historical background",
    "traditions": "Main culinary traditions",
    "festivals": "Important food-related festivals",
    "influences": "Major cultural influences"
  },
  "servingEtiquette": {
    "tableSettings": "Table arrangement guidelines",
    "diningCustoms": "Dining rules",
    "servingOrder": "Course sequence",
    "taboos": "Things to avoid",
    "summary": "Overall dining etiquette summary"
  }
}

For keyIngredients and cookingTechniques, make sure they are plain strings with ONLY newline (\\n) separators between items, not arrays.
Do NOT use bullet points, numbers or any prefixes for the ingredients or techniques.
STRICTLY FOLLOW THE EXACT FORMAT SHOWN ABOVE for keyIngredients and cookingTechniques.`

  let parsed
  try {
    parsed = await aiJson({ prompt, maxTokens: 2048 })
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(500, "Failed to generate cuisine details: " + (e.message || "Unknown error"), { error: "Failed to generate cuisine details" })
  }
  if (!parsed || !parsed.description) {
    throw new HttpError(500, "Failed to generate cuisine details: Invalid response from AI service - missing required fields", { error: "Failed to generate cuisine details" })
  }
  const strip = s => s.replace(/^\d+\.\s+|^-\s+|^\*\s+/gm, "")
  return {
    ...parsed,
    keyIngredients:
      typeof parsed.keyIngredients === "string"
        ? strip(parsed.keyIngredients)
        : Array.isArray(parsed.keyIngredients)
          ? parsed.keyIngredients.join("\n")
          : "Ingredient 1\nIngredient 2\nIngredient 3\nIngredient 4\nIngredient 5",
    cookingTechniques:
      typeof parsed.cookingTechniques === "string"
        ? strip(parsed.cookingTechniques)
        : Array.isArray(parsed.cookingTechniques)
          ? parsed.cookingTechniques.join("\n")
          : "Technique 1\nTechnique 2\nTechnique 3"
  }
}

async function generateCulturalDetails(cuisine) {
  const prompt = `Generate detailed cultural information about ${cuisine.name} cuisine.
    
    Include:
    1. A comprehensive description
    2. Key ingredients commonly used
    3. Traditional cooking techniques
    4. Cultural context and history
    5. Serving etiquette and customs
    
    Return the information in this exact JSON format:
    {
      "description": "Detailed description",
      "keyIngredients": "Ingredient 1\\nIngredient 2\\nIngredient 3",
      "cookingTechniques": "Technique 1\\nTechnique 2\\nTechnique 3",
      "culturalContext": {
        "history": "Brief Historical background",
        "traditions": "key culinary traditions",
        "festivals": "celebrations and Related Food festivals",
        "influences": "Cultural and historical influences"
      },
      "servingEtiquette": {
        "tableSettings": "table arrangement guidelines as bullet points. Do not use numbers or other markers",
        "diningCustoms": "dining rules as bullet points. Do not use numbers or other markers",
        "servingOrder": "Course sequence as bullet points. Do not use numbers or other markers",
        "taboos": "Things to avoid as bullet points. Do not use numbers or other markers",
        "general": "overall dining etiquette summary. Do not use numbers or other markers"
      }
    }`
  const parsed = await aiJson({ prompt, maxTokens: 2048 })
  if (!parsed || !parsed.description) throw new Error("Invalid response from AI service")
  return parsed
}

async function generateCulturalRecipeDetails(recipeName, cuisineName) {
  const prompt = `Generate detailed cultural recipe information for "${recipeName}" from ${cuisineName} cuisine.

    Return EXACTLY this JSON structure with no additional text:
    {
      "description": "string (a short description of the recipe and its cultural significance)",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "authenticIngredients": [
        "2 cups rice",
        "1 pound chicken",
        "3 tablespoons oil",
        "2 cloves garlic",
        "1 teaspoon salt"
      ],
      "instructions": [
        "Step 1: Prepare ingredients",
        "Step 2: Cook rice",
        "Step 3: Cook chicken",
        "Step 4: Combine and serve"
      ]
    }

    Important:
    - Each ingredient must include both the amount and the ingredient name
    - Use standard measurements (cups, tablespoons, teaspoons, pounds, ounces, etc.)
    - Include all essential ingredients for an authentic recipe
    - Instructions should be clear, numbered steps`
  const data = (await aiJson({ prompt, maxTokens: 2048 })) || {}
  return {
    description: data.description || "",
    difficulty: data.difficulty || "intermediate",
    authenticIngredients: Array.isArray(data.authenticIngredients) ? data.authenticIngredients : [],
    instructions: Array.isArray(data.instructions) ? data.instructions : []
  }
}

async function getPairings(recipe, cuisine) {
  const traditional = getTraditionalPairings(regionKey(cuisine?.region))
  const prompt = `Suggest specific food pairings for this ${cuisine?.name || ""} recipe:
    Recipe: ${JSON.stringify({ name: recipe.name, ingredients: recipe.authenticIngredients })}
    
    Return JSON with these categories:
    {
      "mainDishes": string[] (dishes that complement this recipe),
      "sideDishes": string[] (appropriate side dishes),
      "desserts": string[] (dessert pairings),
      "beverages": string[] (drink pairings)
    }`
  try {
    const ai = (await aiJson({ prompt, maxTokens: 1024 })) || {}
    const out = {}
    for (const k of ["mainDishes", "sideDishes", "desserts", "beverages"]) {
      out[k] = unique(traditional[k], Array.isArray(ai[k]) ? ai[k] : [])
    }
    return out
  } catch (e) {
    console.error("Error generating pairings:", e)
    return traditional
  }
}

async function getEtiquette(recipe, cuisine) {
  const regional = getRegionalEtiquette(regionKey(cuisine?.region))
  const prompt = `Provide specific serving etiquette for this ${cuisine?.name || ""} dish:
    Recipe: ${JSON.stringify({ name: recipe.name, culturalNotes: recipe.culturalNotes, servingSuggestions: recipe.servingSuggestions })}
    
    Return JSON with these categories:
    {
      "presentation": string[] (visual presentation guidelines),
      "customs": string[] (dining customs to observe),
      "taboos": string[] (practices to avoid),
      "servingOrder": string[] (proper serving sequence)
    }`
  try {
    const ai = (await aiJson({ prompt, maxTokens: 1024 })) || {}
    const out = {}
    for (const k of ["presentation", "customs", "taboos", "servingOrder"]) {
      out[k] = unique(regional[k], Array.isArray(ai[k]) ? ai[k] : [])
    }
    return out
  } catch (e) {
    console.error("Error generating etiquette:", e)
    return regional
  }
}

route("POST", "/api/ai/generate-cuisine-details", async ({ body }) => {
  const { cuisine } = body
  if (!cuisine || !cuisine.name) throw bad(400, "Missing required cuisine data")
  try {
    return await generateCulturalDetails(cuisine)
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(500, e.message || "Failed to generate cuisine details", { error: "Failed to generate cuisine details" })
  }
})

async function generateRecipeOrCuisine(recipeName, cuisineName) {
  const recipeNameStr = normalizeName(recipeName)
  const cuisineNameStr = normalizeName(cuisineName)
  if (!recipeNameStr || !cuisineNameStr) throw bad(400, "Missing required fields")
  try {
    if (
      recipeNameStr === cuisineNameStr ||
      cuisineNameStr.includes(recipeNameStr) ||
      recipeNameStr.includes(cuisineNameStr)
    ) {
      return await generateCuisineDetailsFromName(recipeNameStr, cuisineNameStr)
    }
    return await generateCulturalRecipeDetails(recipeNameStr, cuisineNameStr)
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(500, e.message || "Failed to generate details", { error: "Failed to generate details" })
  }
}

route("POST", "/api/ai/generate-cultural-recipe", ({ body }) =>
  generateRecipeOrCuisine(body.recipeName, body.cuisineName)
)

// The UI's ai-services client calls this variant with { recipeName, cuisine }.
route("POST", "/api/ai/generate-cultural-recipe-details", ({ body }) =>
  generateRecipeOrCuisine(body.recipeName, body.cuisineName ?? body.cuisine)
)

// ------------------------------------------------- built-in regional tables
function getTraditionalPairings(region) {
  const pairings = {
    east_asia: {
      mainDishes: ["Steamed Fish", "Stir-fried Vegetables", "Clay Pot Rice"],
      sideDishes: ["Pickled Vegetables", "Cold Salad", "Steamed Eggs"],
      desserts: ["Red Bean Soup", "Mango Pudding", "Egg Tarts"],
      beverages: ["Jasmine Tea", "Oolong Tea", "Rice Wine"]
    },
    southeast_asia: {
      mainDishes: ["Green Curry", "Pad Thai", "Beef Rendang"],
      sideDishes: ["Som Tam", "Sticky Rice", "Roti Canai"],
      desserts: ["Mango Sticky Rice", "Thai Tea Ice Cream", "Kuih"],
      beverages: ["Thai Iced Tea", "Coconut Water", "Sugarcane Juice"]
    },
    south_asia: {
      mainDishes: ["Butter Chicken", "Biryani", "Dal Makhani"],
      sideDishes: ["Naan", "Raita", "Chutney"],
      desserts: ["Gulab Jamun", "Kheer", "Jalebi"],
      beverages: ["Lassi", "Masala Chai", "Rooh Afza"]
    },
    middle_east: {
      mainDishes: ["Lamb Shawarma", "Falafel", "Kebabs"],
      sideDishes: ["Hummus", "Tabbouleh", "Baba Ganoush"],
      desserts: ["Baklava", "Kunafa", "Turkish Delight"],
      beverages: ["Mint Tea", "Turkish Coffee", "Ayran"]
    },
    mediterranean: {
      mainDishes: ["Paella", "Moussaka", "Risotto"],
      sideDishes: ["Greek Salad", "Bruschetta", "Dolmas"],
      desserts: ["Tiramisu", "Baklava", "Panna Cotta"],
      beverages: ["Wine", "Limoncello", "Ouzo"]
    },
    latin_america: {
      mainDishes: ["Tacos", "Mole Poblano", "Feijoada"],
      sideDishes: ["Guacamole", "Elote", "Black Beans"],
      desserts: ["Tres Leches Cake", "Churros", "Flan"],
      beverages: ["Horchata", "Margarita", "Agua Fresca"]
    },
    caribbean: {
      mainDishes: ["Jerk Chicken", "Curry Goat", "Ackee and Saltfish"],
      sideDishes: ["Rice and Peas", "Festival", "Plantains"],
      desserts: ["Rum Cake", "Sweet Potato Pudding", "Coconut Drops"],
      beverages: ["Rum Punch", "Sorrel Drink", "Ginger Beer"]
    },
    west_africa: {
      mainDishes: ["Jollof Rice", "Egusi Soup", "Peanut Stew"],
      sideDishes: ["Fufu", "Fried Plantains", "Moin Moin"],
      desserts: ["Chin Chin", "Puff Puff", "Coconut Candy"],
      beverages: ["Palm Wine", "Bissap", "Ginger Drink"]
    },
    east_africa: {
      mainDishes: ["Injera with Wat", "Nyama Choma", "Pilau Rice"],
      sideDishes: ["Chapati", "Sukuma Wiki", "Ugali"],
      desserts: ["Mandazi", "Kashata", "Maandazi"],
      beverages: ["Ethiopian Coffee", "Tangawizi", "Urwaga"]
    },
    north_africa: {
      mainDishes: ["Couscous", "Tagine", "Shakshuka"],
      sideDishes: ["Harissa", "Zaalouk", "Batbout"],
      desserts: ["Makroud", "Msemen", "Basbousa"],
      beverages: ["Mint Tea", "Almond Milk", "Hibiscus Tea"]
    }
  }

  return (
    pairings[region] || {
      mainDishes: [],
      sideDishes: [],
      desserts: [],
      beverages: []
    }
  )
}

function getRegionalEtiquette(region) {
  const etiquette = {
    east_asia: {
      presentation: [
        "Serve rice in individual bowls",
        "Place shared dishes in the center",
        "Arrange food to highlight colors and textures",
        "Use small plates for individual portions"
      ],
      customs: [
        "Hold rice bowl close to mouth",
        "Use chopsticks correctly",
        "Pour tea for others before yourself",
        "Tap fingers as thanks when someone pours tea for you"
      ],
      taboos: [
        "Don't stick chopsticks vertically in rice",
        "Don't pass food directly from chopsticks to chopsticks",
        "Don't point with chopsticks",
        "Don't flip fish over on the plate"
      ],
      servingOrder: [
        "Soup first",
        "Rice and main dishes together",
        "Fruit or light dessert last",
        "Tea throughout the meal"
      ]
    },
    southeast_asia: {
      presentation: [
        "Serve food family-style on a raised platform",
        "Arrange dishes by spice level",
        "Include contrasting textures and flavors",
        "Garnish with fresh herbs and lime wedges"
      ],
      customs: [
        "Eat with right hand in some regions",
        "Use fork and spoon (fork to push, spoon to eat)",
        "Take small portions to sample everything",
        "Cool spicy dishes with plain rice"
      ],
      taboos: [
        "Don't use left hand for eating",
        "Don't place serving spoons in your mouth",
        "Don't leave chopsticks crossed",
        "Don't waste rice"
      ],
      servingOrder: [
        "All dishes served simultaneously",
        "Rice as the foundation",
        "Balance between spicy, sour, sweet and savory in one meal",
        "Fresh fruit for dessert"
      ]
    },
    south_asia: {
      presentation: [
        "Serve on thali plates with small compartments",
        "Balance colors and textures across the plate",
        "Place bread and rice separately",
        "Arrange accompaniments in small bowls"
      ],
      customs: [
        "Traditionally eat with right hand fingers",
        "Tear bread with fingers, not cutlery",
        "Share food and offer to others first",
        "Mix rice with curry using fingertips"
      ],
      taboos: [
        "Don't use left hand for eating or passing food",
        "Don't waste food on your plate",
        "Don't start eating before elders or guests",
        "Don't lick fingers in formal settings"
      ],
      servingOrder: [
        "Begin with something sweet in some regions",
        "Serve bread and rice with main dishes",
        "Sweet dish or paan to conclude the meal",
        "Yogurt or raita to balance spice"
      ]
    },
    middle_east: {
      presentation: [
        "Large central platters for sharing",
        "Multiple small mezze dishes",
        "Vibrant colors and garnishes",
        "Arrange bread in cloth-lined baskets"
      ],
      customs: [
        "Break bread with hands, never cut with knife",
        "Dip bread in shared dishes",
        "Serve elders and guests first",
        "Use right hand for eating"
      ],
      taboos: [
        "Don't refuse offered food (take at least a small portion)",
        "Don't eat with left hand",
        "Don't rush through meals",
        "Don't blow on hot food"
      ],
      servingOrder: [
        "Mezze (small appetizers) first",
        "Main dishes with bread",
        "Sweet tea and desserts after the meal",
        "Coffee to conclude"
      ]
    },
    mediterranean: {
      presentation: [
        "Simple, rustic presentation",
        "Fresh herbs as garnish",
        "Olive oil drizzled as finishing touch",
        "Colorful vegetable arrangements"
      ],
      customs: [
        "Bread accompanies the entire meal",
        "Share multiple dishes family-style",
        "Use bread to soak up sauces",
        "Leisurely pace with conversation"
      ],
      taboos: [
        "Don't rush the meal",
        "Don't waste bread",
        "Don't add cheese to seafood pasta in Italy",
        "Don't ask for additional seasoning before tasting"
      ],
      servingOrder: [
        "Antipasti/appetizers",
        "Pasta or rice dish",
        "Main protein dish",
        "Salad course",
        "Cheese and fruit",
        "Dessert and coffee"
      ]
    },
    latin_america: {
      presentation: [
        "Colorful arrangements",
        "Fresh garnishes like cilantro and lime",
        "Serve with traditional salsas on the side",
        "Family-style large platters"
      ],
      customs: [
        "Wait for eldest to begin eating",
        "Keep hands visible on table, not in lap",
        "Use tortillas or bread to scoop food",
        "Express appreciation for the food"
      ],
      taboos: [
        "Don't eat tacos with fork and knife",
        "Don't add hot sauce before tasting",
        "Don't refuse offered food in someone's home",
        "Don't leave the table until everyone is finished"
      ],
      servingOrder: [
        "Soup or light appetizer",
        "Main course with sides",
        "Dessert",
        "Coffee or digestif"
      ]
    }
  }

  return (
    etiquette[region] || {
      presentation: [],
      customs: [],
      taboos: [],
      servingOrder: []
    }
  )
}
