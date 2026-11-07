import config from "@/lib/config"

export async function getEquipmentRecommendations(
  currentEquipment,
  cookingPreferences,
  budget
) {
  try {
    // Try server endpoint first
    return await fallbackToBackendRecommendations(currentEquipment, cookingPreferences, budget)
  } catch (error) {
    console.error("Server endpoint failed, using mock data:", error)
    return getMockRecommendations(currentEquipment, cookingPreferences)
  }
}

async function fallbackToBackendRecommendations(
  currentEquipment,
  cookingPreferences,
  budget
) {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/kitchen-equipment/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ currentEquipment, cookingPreferences, budget })
    })

    if (!response.ok) throw new Error("Failed to get equipment recommendations")
    return response.json()
  } catch (error) {
    console.error("Backend API failed for recommendations:", error)
    // Return mock data as last resort
    return getMockRecommendations(currentEquipment, cookingPreferences)
  }
}

export async function generateMaintenanceSchedule(
  equipment,
  startDate,
  endDate
) {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/kitchen-equipment/maintenance-schedule`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ equipment, startDate, endDate })
      }
    )

    if (!response.ok) {
      throw new Error("Failed to generate maintenance schedule")
    }

    return response.json()
  } catch (error) {
    console.error("Backend API failed for maintenance schedule:", error)
    return generateMaintenanceScheduleLogic(equipment, startDate, endDate)
  }
}

// Generate a date based on equipment condition
function generateDateBasedOnCondition(equipment, startDate, endDate) {
  if (!equipment) {
    // Generate random date if equipment not found
    const start = new Date(startDate)
    const end = new Date(endDate)
    const randomDate = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    )
    return randomDate.toISOString().split("T")[0]
  }

  // Generate date based on condition
  const today = new Date()
  const scheduledDate = new Date(today)
  let maintenanceDelay = 0

  switch (equipment.condition) {
    case "excellent":
      maintenanceDelay = 90
      break // 3 months
    case "good":
      maintenanceDelay = 45
      break // 1.5 months
    case "fair":
      maintenanceDelay = 21
      break // 3 weeks
    case "needs-maintenance":
      maintenanceDelay = 3
      break // 3 days
    case "replace":
      maintenanceDelay = 0
      break // immediately
    default:
      maintenanceDelay = 30 // 1 month default
  }

  scheduledDate.setDate(today.getDate() + maintenanceDelay)

  // Make sure the date is within our range
  const start = new Date(startDate)
  const end = new Date(endDate)

  const finalDate = new Date(
    Math.max(Math.min(scheduledDate.getTime(), end.getTime()), start.getTime())
  )

  return finalDate.toISOString().split("T")[0]
}

// Generate tasks based on equipment type
function generateTasksForEquipment(equipment) {
  if (!equipment) {
    return [
      "Check condition",
      "Clean thoroughly",
      "Test functionality",
      "Document any issues"
    ]
  }

  const name = equipment.name.toLowerCase()

  if (name.includes("processor")) {
    return [
      "Clean blades thoroughly after each use",
      "Check all connections and attachments",
      "Test all speed settings",
      "Verify lid seal is intact and functional"
    ]
  } else if (name.includes("knife")) {
    return [
      "Sharpen the blade",
      "Check handle for cracks or looseness",
      "Clean thoroughly and dry completely",
      "Store in a protective sheath or block"
    ]
  } else if (name.includes("skillet") || name.includes("pan")) {
    return [
      "Re-season the cooking surface",
      "Check for rust spots",
      "Ensure handle is securely attached",
      "Clean without abrasive cleaners"
    ]
  } else if (name.includes("mixer")) {
    return [
      "Clean all attachments and mixing bowl",
      "Check power cord for damage",
      "Test all speed settings",
      "Lubricate moving parts if needed"
    ]
  } else {
    return [
      `Clean ${equipment.name} thoroughly`,
      `Inspect ${equipment.name} for wear and damage`,
      `Test all functions of ${equipment.name}`,
      `Store ${equipment.name} properly when not in use`
    ]
  }
}

// Our own logic for generating a maintenance schedule
function generateMaintenanceScheduleLogic(equipment, startDate, endDate) {
  console.log(
    "Generating intelligent maintenance schedule based on equipment data"
  )

  // Create a set to track equipment IDs we've already scheduled
  const processedIds = new Set()
  const schedules = []

  // Process each equipment item once
  equipment.forEach(item => {
    // Skip if we already created a schedule for this equipment
    if (processedIds.has(item.id)) {
      return
    }

    // Mark this equipment as processed
    processedIds.add(item.id)

    // Generate the schedule for this equipment
    const nextMaintenanceDate = generateDateBasedOnCondition(
      item,
      startDate,
      endDate
    )
    const tasks = generateTasksForEquipment(item)

    // Determine priority based on condition
    let priority
    switch (item.condition) {
      case "needs-maintenance":
      case "replace":
        priority = "high"
        break
      case "fair":
        priority = "medium"
        break
      default:
        priority = "low"
    }

    // Calculate estimated duration based on number of tasks
    const estimatedDuration = `${Math.max(30, tasks.length * 15)} minutes`

    schedules.push({
      equipmentId: item.id.toString(), // Convert to string as required by type
      nextMaintenanceDate,
      tasks,
      estimatedDuration,
      priority
    })
  })

  return schedules
}

export async function getRecipesByEquipment(equipment, userPreferences) {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/kitchen-equipment/recipe-matches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ equipment, userPreferences })
      }
    )

    if (!response.ok) throw new Error("Failed to get recipe matches")
    return response.json()
  } catch (error) {
    console.error("Backend API failed for recipe matches:", error)
    return getMockRecipeMatches(equipment, userPreferences)
  }
}

async function fallbackToBackendRecipeMatches(equipment, userPreferences) {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/kitchen-equipment/recipe-matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ equipment, userPreferences })
    })

    if (!response.ok) throw new Error("Failed to get recipe matches")
    return response.json()
  } catch (error) {
    console.error("Backend API failed for recipe matches:", error)
    // Return mock data as last resort
    return getMockRecipeMatches(equipment, userPreferences)
  }
}

// Mock data functions for fallback when both APIs fail
function getMockRecommendations(currentEquipment, cookingPreferences) {
  const hasProcessor = currentEquipment.some(e =>
    e.name.toLowerCase().includes("processor")
  )
  const hasSkillet = currentEquipment.some(e =>
    e.name.toLowerCase().includes("skillet")
  )

  return [
    {
      id: 1,
      name: hasProcessor ? "High-Quality Chef's Knife" : "Food Processor",
      reason: hasProcessor
        ? "A quality chef's knife is essential for precise cutting and food preparation"
        : "Would greatly speed up food preparation and enable more complex recipes",
      priority: "high",
      estimatedCost: hasProcessor ? "$80-150" : "$100-250"
    },
    {
      id: 2,
      name: hasSkillet ? "Dutch Oven" : "Cast Iron Skillet",
      reason: hasSkillet
        ? "Perfect for slow cooking stews, soups, and braising"
        : "Versatile cookware for searing, baking, and stovetop cooking",
      priority: "medium",
      estimatedCost: hasSkillet ? "$70-200" : "$30-100"
    },
    {
      id: 3,
      name: "Digital Kitchen Scale",
      reason:
        "Essential for precise measurements in baking and portion control",
      priority: "medium",
      estimatedCost: "$15-30"
    }
  ]
}

// Replace the mock function with our intelligent schedule generator
function getMockMaintenanceSchedule(equipment, startDate, endDate) {
  return generateMaintenanceScheduleLogic(equipment, startDate, endDate)
}

function getMockRecipeMatches(equipment, userPreferences) {
  const hasProcessor = equipment.some(e =>
    e.name.toLowerCase().includes("processor")
  )
  const hasSkillet = equipment.some(e =>
    e.name.toLowerCase().includes("skillet")
  )
  const hasMixer = equipment.some(e => e.name.toLowerCase().includes("mixer"))
  const hasKnife = equipment.some(e => e.name.toLowerCase().includes("knife"))

  const possibleRecipes = [
    {
      id: 1,
      title: "Simple Pasta with Tomato Sauce",
      description:
        "A classic Italian dish featuring al dente pasta tossed in a rich tomato sauce. Perfect for beginners and quick weeknight meals.",
      requiredEquipment: ["Chef's Knife", "Large Pot"],
      nutritionInfo: {
        calories: 450,
        protein: 12,
        carbs: 65,
        fat: 15
      }
    },
    {
      id: 2,
      title: "Pan-Seared Steak",
      description:
        "Restaurant-quality steak cooked to perfection in a cast iron skillet, developing a beautiful crust while staying juicy inside.",
      requiredEquipment: ["Cast Iron Skillet", "Chef's Knife"],
      nutritionInfo: {
        calories: 350,
        protein: 35,
        carbs: 0,
        fat: 22
      }
    }
  ]

  if (hasProcessor) {
    possibleRecipes.push({
      id: 3,
      title: "Homemade Hummus",
      description:
        "Creamy and smooth hummus made from scratch with chickpeas, tahini, and fresh lemon juice.",
      requiredEquipment: ["Food Processor"],
      nutritionInfo: {
        calories: 180,
        protein: 8,
        carbs: 20,
        fat: 10
      }
    })
  }

  if (hasSkillet && hasKnife) {
    possibleRecipes.push({
      id: 4,
      title: "Stir-Fried Vegetables",
      description:
        "Colorful medley of fresh vegetables stir-fried to crisp-tender perfection with aromatic garlic and ginger.",
      requiredEquipment: ["Cast Iron Skillet", "Chef's Knife"],
      nutritionInfo: {
        calories: 150,
        protein: 5,
        carbs: 25,
        fat: 6
      }
    })
  }

  if (hasMixer) {
    possibleRecipes.push({
      id: 5,
      title: "Artisan Bread",
      description:
        "Crusty on the outside, soft on the inside artisan bread made with just a few simple ingredients.",
      requiredEquipment: ["Stand Mixer", "Baking Sheet"],
      nutritionInfo: {
        calories: 120,
        protein: 4,
        carbs: 23,
        fat: 1
      }
    })
  }

  const recommendedPurchases = [
    {
      equipment: hasProcessor ? "Immersion Blender" : "Food Processor",
      enabledRecipes: ["Creamy Soups", "Homemade Hummus", "Pesto Sauce"]
    },
    {
      equipment: hasMixer ? "Dutch Oven" : "Stand Mixer",
      enabledRecipes: hasMixer
        ? ["No-Knead Bread", "Braised Short Ribs", "French Onion Soup"]
        : ["Homemade Bread", "Cake Batter", "Cookie Dough"]
    }
  ]

  return { possibleRecipes, recommendedPurchases }
}
