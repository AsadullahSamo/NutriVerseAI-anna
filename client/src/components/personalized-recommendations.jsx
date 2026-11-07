import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import {
  Loader2,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
  ShoppingBasket,
  ListOrdered,
  Apple,
  Heart
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"

export function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const { data: currentGoal } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    }
  })

  const getRecommendations = async () => {
    if (!currentGoal) {
      toast({
        title: "Error",
        description: "Please set up your nutrition goals first",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setRecommendations([])

    try {
      const response = await apiRequest("GET", "/api/recipes/personalized")
      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No personalized recommendations available")
      }

      setRecommendations(data)
      toast({
        title: "Success",
        description: `Generated ${data.length} personalized recipe recommendations!`
      })
    } catch (error) {
      console.error("Personalized recommendation error:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate personalized recommendations. Please try again."

      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Personalized Recommendations
        </h2>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <div className="space-y-4">
          <Button
            onClick={getRecommendations}
            disabled={isLoading || !currentGoal}
            className="w-full relative bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Personalized Recipes...
              </>
            ) : (
              <>
                <ChefHat className="mr-2 h-4 w-4" />
                Get Personalized Recommendations
              </>
            )}
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {recommendations.map((recipe, index) => (
          <Card
            key={index}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <CardHeader className="border-b bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                {recipe.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
                  Ingredients
                </h4>
                <ul className="list-disc pl-4 space-y-1">
                  {recipe.ingredients?.map((ing, i) => (
                    <li key={i} className="text-muted-foreground">
                      {ing}
                    </li>
                  )) ?? <li>No ingredients listed</li>}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                  Instructions
                </h4>
                <ol className="list-decimal pl-4 space-y-2">
                  {recipe.instructions?.map((step, i) => (
                    <li key={i} className="text-muted-foreground">
                      {step}
                    </li>
                  )) ?? <li>No instructions available</li>}
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Apple className="h-4 w-4 text-muted-foreground" />
                  Nutrition Info
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Calories</p>
                    <p className="font-medium">{recipe.nutritionInfo?.calories || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Protein</p>
                    <p className="font-medium">{recipe.nutritionInfo?.protein || 0}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Carbs</p>
                    <p className="font-medium">{recipe.nutritionInfo?.carbs || 0}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fat</p>
                    <p className="font-medium">{recipe.nutritionInfo?.fat || 0}g</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 