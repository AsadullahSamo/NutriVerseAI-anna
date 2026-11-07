import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { getRecipeRecommendations } from "@/ai-services/recipe-ai"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  ChefHat,
  UtensilsCrossed,
  ShoppingBasket,
  ListOrdered,
  Apple
} from "lucide-react"

// Add delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export function RecipeRecommendations() {
  const [ingredients, setIngredients] = useState([])
  const [currentIngredient, setCurrentIngredient] = useState("")
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const addIngredient = () => {
    if (currentIngredient.trim()) {
      setIngredients(prev => [...prev, currentIngredient.trim()])
      setCurrentIngredient("")
    }
  }

  const removeIngredient = index => {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const getRecommendations = async () => {
    if (ingredients.length === 0) {
      toast.error("Error", {
        description: "Please add at least one ingredient"
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setRecommendations([])

    try {
      // Add a small delay before making the API call
      await delay(500)

      console.log("Fetching recommendations for:", ingredients)
      const recipes = await getRecipeRecommendations(ingredients)
      console.log("Received recipes:", recipes)

      if (!Array.isArray(recipes) || recipes.length === 0) {
        throw new Error("No recipes found for these ingredients")
      }

      setRecommendations(recipes)
      toast.success("Success", {
        description: `Generated ${recipes.length} recipe recommendations!`
      })
    } catch (error) {
      console.error("Recipe recommendation error:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate recipes. Please try again with different ingredients."

      setError(errorMessage)
      toast.error("Error", {
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Recipe Recommendations
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
          <div className="flex gap-2">
            <Input
              value={currentIngredient}
              onChange={e => setCurrentIngredient(e.target.value)}
              placeholder="Enter an ingredient"
              onKeyDown={e => e.key === "Enter" && addIngredient()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={addIngredient}
              disabled={isLoading}
              variant="secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {ingredients.map((ingredient, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors px-3 py-1"
                onClick={() => removeIngredient(index)}
              >
                {ingredient}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>

          <Button
            onClick={getRecommendations}
            disabled={isLoading || ingredients.length === 0}
            className="w-full relative bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Recipes...
              </>
            ) : (
              <>
                <ChefHat className="mr-2 h-4 w-4" />
                Get Recipe Recommendations
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
                    <li
                      key={i}
                      className="text-muted-foreground leading-relaxed"
                    >
                      {step}
                    </li>
                  )) ?? <li>No instructions provided</li>}
                </ol>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Apple className="h-4 w-4 text-muted-foreground" />
                  Nutrition Information
                </h4>
                <Badge variant="secondary" className="font-mono">
                  {recipe.nutritionalValue ||
                    "Nutritional information not available"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

