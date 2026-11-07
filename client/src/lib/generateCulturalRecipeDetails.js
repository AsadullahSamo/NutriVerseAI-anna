export async function generateCulturalRecipeDetails(recipeName, cuisineName) {
    try {
      console.log("[Client] Generating recipe details for:", {
        recipeName,
        cuisineName
      })
  
      // Import config to get the API base URL
      const config = (await import("@/lib/config")).default;
      const apiUrl = `${config.apiBaseUrl}/api/ai/generate-cultural-recipe`;
      
      console.log("[Client] Sending request to:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          recipeName,
          cuisineName
        })
      })
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[Client] Server error:", errorData)
        throw new Error(errorData.message || "Failed to generate recipe details")
      }
  
      const data = await response.json()
      console.log("[Client] Received data from server:", data)
      return data
    } catch (error) {
      console.error("[Client] Error generating recipe details:", error)
      throw error
    }
  }
  