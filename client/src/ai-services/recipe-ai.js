import config from "@/lib/config"

export async function generateAIMealPlan(
  preferences,
  days = 7,
  dietaryRestrictions,
  calorieTarget
) {
  // Enforce 7-day limit
  if (days > 7) {
    throw new Error("Meal plans cannot exceed 7 days")
  }

  try {
    console.log("[Client] Requesting meal plan from backend...")
    const apiUrl = `${config.apiBaseUrl}/api/ai/meal-plan`
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        preferences,
        days,
        dietaryRestrictions,
        calorieTarget
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.message || errorData.error || "Failed to generate meal plan"
      )
    }

    const mealPlan = await response.json()

    // Basic validation to guard UI from malformed responses
    if (!Array.isArray(mealPlan)) {
      throw new Error("Meal plan response is not an array")
    }

    return mealPlan
  } catch (error) {
    console.error("[Client] Error generating meal plan:", error)
    throw new Error("Failed to generate meal plan - please try again")
  }
}

export async function generateRecipeDetails(recipeName, cuisine, preferences) {
  try {
    console.log("[Client] Generating recipe details for:", { recipeName, cuisine, preferences });
    const apiUrl = `${config.apiBaseUrl}/api/ai/generate-recipe`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        title: recipeName,
        cuisine,
        preferences
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "Failed to generate recipe details");
    }

    const result = await response.json();
    console.log("[Client] Generated recipe details:", result);
    return result;
  } catch (error) {
    console.error("[Client] Error generating recipe details:", error);
    throw error;
  }
}

export async function getRecipeRecommendations(ingredients, dietaryPreferences) {
  try {
    console.log("[Client] Getting recipe recommendations for:", { ingredients, dietaryPreferences });
    const apiUrl = `${config.apiBaseUrl}/api/ai/recipe-recommendations`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        ingredients,
        dietaryPreferences
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "Failed to get recipe recommendations");
    }

    const result = await response.json();
    console.log("[Client] Generated recipe recommendations:", result);
    return result;
  } catch (error) {
    console.error("[Client] Error getting recipe recommendations:", error);
    throw error;
  }
}

export async function generatePantryItemDetails(itemName, category) {
  try {
    console.log("[Client] Generating pantry item details for:", { itemName, category });
    const apiUrl = `${config.apiBaseUrl}/api/ai/generate-pantry-item`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        itemName,
        category
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "Failed to generate pantry item details");
    }

    const result = await response.json();
    console.log("[Client] Generated pantry item details:", result);
    return result;
  } catch (error) {
    console.error("[Client] Error generating pantry item details:", error);
    throw error;
  }
}

// ...rest of existing functions...
