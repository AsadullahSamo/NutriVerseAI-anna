import config from "@/lib/config"

export async function analyzeKitchenInventory(
  equipment,
  userCookingPreferences
) {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/kitchen-equipment/analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ equipment, userPreferences: userCookingPreferences })
      }
    )

    if (!response.ok) {
      throw new Error("Failed to analyze kitchen inventory")
    }

    return response.json()
  } catch (error) {
    console.error("Backend API failed for kitchen inventory analysis:", error)
    return getMockAnalysis(equipment, userCookingPreferences)
  }
}

export async function getMaintenanceTips(equipment) {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/kitchen-equipment/maintenance-tips`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ equipment })
      }
    )

    if (!response.ok) {
      throw new Error("Failed to get maintenance tips")
    }

    return response.json()
  } catch (error) {
    console.error("Backend API failed for maintenance tips:", error)
    return getMockMaintenanceTips(equipment)
  }
}

// Mock data functions for fallback when API is not available
function getMockAnalysis(equipment, userCookingPreferences) {
  const needsMaintenance = equipment.filter(
    e => e.condition === "fair" || e.condition === "needs-maintenance"
  )

  return {
    maintenanceRecommendations: needsMaintenance.map(item => ({
      equipmentId: item.id.toString(),
      recommendation: `Your ${item.name} could use some maintenance soon.`,
      priority: item.condition === "needs-maintenance" ? "high" : "medium",
      suggestedAction:
        item.condition === "needs-maintenance"
          ? `Schedule professional maintenance for your ${item.name}`
          : `Clean and check your ${item.name} for any issues`
    })),
    shoppingRecommendations: [
      {
        itemName: "Immersion Blender",
        reason: "Would complement your soup recipes and sauces",
        priority: "medium",
        estimatedPrice: "$40-60"
      },
      {
        itemName: "Quality Cutting Board",
        reason: "Essential for food preparation and protects your knives",
        priority: "high",
        estimatedPrice: "$25-35"
      }
    ],
    recipeRecommendations: [
      {
        recipeName: "Classic Pasta Primavera",
        possibleWithCurrent: true,
        requiredEquipment: ["Chef's Knife", "Cast Iron Skillet"]
      },
      {
        recipeName: "Homemade Artisan Bread",
        possibleWithCurrent: equipment.some(e =>
          e.name.toLowerCase().includes("mixer")
        ),
        requiredEquipment: ["Stand Mixer", "Baking Sheet"]
      },
      {
        recipeName: "Creamy Soup",
        possibleWithCurrent: equipment.some(e =>
          e.name.toLowerCase().includes("processor")
        ),
        requiredEquipment: ["Food Processor"]
      }
    ]
  }
}

function getMockMaintenanceTips(equipment) {
  const tips = {
    "Food Processor": [
      "Clean blades thoroughly after each use to prevent food buildup",
      "Check the rubber gaskets regularly for wear and replace if needed",
      "Sharpen blades every 6 months for optimal performance",
      "Lubricate moving parts annually with food-grade lubricant"
    ],
    "Stand Mixer": [
      "Wipe down after each use with a damp cloth",
      "Check beaters and attachments for wear",
      "Tighten any loose screws in the body",
      "Clean the head attachment point to ensure smooth operation"
    ],
    "Chef's Knife": [
      "Sharpen regularly using a whetstone or professional service",
      "Hand wash only - dishwashers can damage the blade and handle",
      "Store in a knife block or with a blade guard",
      "Hone the edge before each use with a honing steel"
    ],
    "Cast Iron Skillet": [
      "Re-season every 3-6 months with a thin layer of oil",
      "Never soak in water or use harsh detergents",
      "Dry completely after washing to prevent rust",
      "Store in a dry place with a paper towel to absorb moisture"
    ]
  }

  // Return tips for the specific equipment or generic tips if not found
  return (
    tips[equipment.name] || [
      `Clean your ${equipment.name} after each use`,
      `Check for signs of wear regularly`,
      `Store properly to extend the life of your ${equipment.name}`,
      `Follow manufacturer's maintenance guidelines`
    ]
  )
}
