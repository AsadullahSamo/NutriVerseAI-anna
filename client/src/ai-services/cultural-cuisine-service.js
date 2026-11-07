import config from "@/lib/config";

export async function generateCuisineDetailsFromName(name, region) {
  try {
    const normalizeName = (value) => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object") {
        if (typeof value.name === "string") return value.name.trim();
        if (typeof value.region === "string") return value.region.trim();
      }
      return "";
    };

    const nameStr = normalizeName(name);
    const regionStr = normalizeName(region);

    console.log("[Client] Generating cuisine details for:", { name: nameStr, region: regionStr });
    const apiUrl = `${config.apiBaseUrl}/api/ai/generate-cuisine-details`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ 
        cuisine: {
          name: nameStr,
          region: regionStr
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "Failed to generate cuisine details");
    }

    const data = await response.json();
    console.log("[Client] Received cuisine details:", data);
    return data;
  } catch (error) {
    console.error("[Client] Error generating cuisine details:", error);
    throw error;
  }
}

export async function getCulturalContext(recipe, cuisine) {
  const apiUrl = `${config.apiBaseUrl}/api/cultural-recipes/${recipe.id}/context`;
  const response = await fetch(apiUrl, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error("Failed to get cultural context");
  return await response.json();
}

export async function analyzeCulturalCuisine(cuisine) {
  const apiUrl = `${config.apiBaseUrl}/api/cultural-cuisines/${cuisine.id}/analysis`;
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error("Failed to analyze cuisine");
  return await response.json();
}

export async function getTechniqueTips(technique, cuisine) {
  const apiUrl = `${config.apiBaseUrl}/api/cultural-cuisines/${cuisine.id}/techniques/${technique.id}/tips`;
  const response = await fetch(apiUrl, {
    credentials: "include"
  });
  if (!response.ok) throw new Error("Failed to get technique tips");
  return await response.json();
}

export async function getPairings(recipe, cuisine) {
  const apiUrl = `${config.apiBaseUrl}/api/cultural-recipes/${recipe.id}/pairings`;
  const response = await fetch(apiUrl, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error("Failed to get pairings");
  return await response.json();
}

export async function getEtiquette(recipe, cuisine) {
  const apiUrl = `${config.apiBaseUrl}/api/cultural-recipes/${recipe.id}/etiquette`;
  const response = await fetch(apiUrl, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error("Failed to get etiquette");
  return await response.json();
}

export async function generateCulturalRecipeDetails(recipeName, cuisine) {
  try {
    console.log("[Client] Generating cultural recipe details for:", { recipeName, cuisine });
    const apiUrl = `${config.apiBaseUrl}/api/ai/generate-cultural-recipe-details`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipeName, cuisine }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("[Client] Generated cultural recipe details:", result);
    return result;
  } catch (error) {
    console.error("[Client] Error generating cultural recipe details:", error);
    throw error;
  }
}

export async function generateCulturalDetails(cuisine) {
  try {
    console.log("[Client] Generating cultural details for cuisine:", cuisine);
    const apiUrl = `${config.apiBaseUrl}/api/ai/generate-cuisine-details`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ cuisine })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "Failed to generate cultural details");
    }

    const data = await response.json();
    console.log("[Client] Received cultural details:", data);
    return data;
  } catch (error) {
    console.error("[Client] Error generating cultural details:", error);
    throw error;
  }
}

const culturalCuisineService = {
  generateCuisineDetailsFromName,
  getCulturalContext,
  analyzeCulturalCuisine,
  getTechniqueTips,
  generateCulturalDetails
};

export default culturalCuisineService; 
