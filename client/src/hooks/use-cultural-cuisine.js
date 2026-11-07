import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import config from "@/lib/config"

export function useCuisines() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ["cuisines", user?.id],
    queryFn: async () => {
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime()
      const response = await fetch(`${config.apiBaseUrl}/api/cultural-cuisines?t=${timestamp}`, {
        credentials: "include",
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      })

      if (!response.ok) throw new Error("Failed to fetch cuisines")

      const cuisines = await response.json()

      // If user is logged in, double-check we're not showing any hidden cuisines client-side
      if (user?.id) {
        return cuisines.filter(
          cuisine =>
            !cuisine.hiddenFor ||
            !Array.isArray(cuisine.hiddenFor) ||
            !cuisine.hiddenFor.includes(user.id)
        )
      }

      return cuisines
    },
    staleTime: 0, // Never use stale data
    cacheTime: 0, // Don't cache results
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 0, // Disable automatic refetching
    retry: false, // Don't retry failed requests
    refetchOnReconnect: "always",
    onSettled: () => {
      // Always clear all related queries when this settles
      queryClient.invalidateQueries({ queryKey: ["cuisines"] })
      queryClient.invalidateQueries({ queryKey: ["/api/cultural-cuisines"] })
    },
    onError: error => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch cuisines",
        variant: "destructive"
      })
    }
  })
}

export function useCuisine(id) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["cuisine", id, user?.id],
    queryFn: async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/cultural-cuisines/${id}`, {
        credentials: "include" // Ensure auth cookies are sent
      })
      if (!response.ok) throw new Error("Failed to fetch cuisine")
      return response.json()
    },
    enabled: !!id,
    staleTime: 0, // Don't use stale data
    cacheTime: 0, // Don't cache results to ensure fresh data
    retry: false // Don't retry if the cuisine is not found (likely hidden)
  })
}

export function useRecipesByCuisine(cuisineId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["recipes", cuisineId, user?.id],
    queryFn: async () => {
      const response = await fetch(
        `${config.apiBaseUrl}/api/cultural-recipes?cuisineId=${cuisineId}`,
        {
          credentials: "include" // Ensure auth cookies are sent
        }
      )
      if (!response.ok) throw new Error("Failed to fetch recipes")
      return response.json()
    },
    enabled: !!cuisineId,
    staleTime: 0, // Don't use stale data
    cacheTime: 0 // Don't cache results to ensure fresh data
  })
}

export function useRecipe(id) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["recipe", id, user?.id],
    queryFn: async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/cultural-recipes/${id}`, {
        credentials: "include" // Ensure auth cookies are sent
      })
      if (!response.ok) throw new Error("Failed to fetch recipe")
      return response.json()
    },
    enabled: !!id,
    staleTime: 0, // Don't use stale data
    cacheTime: 0, // Don't cache results to ensure fresh data
    retry: false // Don't retry if the recipe is not found (likely hidden)
  })
} 