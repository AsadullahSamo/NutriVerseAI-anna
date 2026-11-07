import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  ChefHat,
  Loader2,
  Edit,
  History,
  Star,
  UtensilsCrossed,
  Map,
  Scroll,
  Info,
  Globe2,
  Wine,
  Palette,
  ListOrdered,
  Ban,
  MapPin
} from "lucide-react"
import {
  getTechniqueTips,
  getPairings,
  getEtiquette
} from "@/ai-services/cultural-cuisine-service"
import { ScrollArea } from "@/components/ui/scroll-area"
import { generateCulturalRecipeDetails } from "@/ai-services/cultural-cuisine-service"
import config from "@/lib/config"

const stripStepPrefix = step => {
  if (typeof step !== "string") return step
  return step.replace(/^\s*step\s*\d+\s*[:.\-)]\s*/i, "").trimStart()
}

export function RecipeDetails({ recipe, cuisine, onBack }) {
  const { user } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isEditingInstructions, setIsEditingInstructions] = useState(false)
  const [isEditingIngredients, setIsEditingIngredients] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pairings, setPairings] = useState(null)
  const [etiquette, setEtiquette] = useState(null)
  const [techniqueTips, setTechniqueTips] = useState([])
  const [culturalContext, setCulturalContext] = useState(null)
  const [localImageUrl, setLocalImageUrl] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const canDeleteRecipe = user?.id === recipe.createdBy

  // Add console logging at the start of component
  console.log("Full recipe details:", {
    ...recipe,
    hasImageUrl: !!recipe.image_url,
    fallbackImageUrl: `https://source.unsplash.com/1200x800/?${encodeURIComponent(
      recipe.name.toLowerCase() + " italian food"
    )}`
  })

  // Add new function to handle image loading errors
  const getFallbackImageUrl = recipeName => {
    return `https://source.unsplash.com/1200x800/?${encodeURIComponent(
      recipeName.toLowerCase() + " " + cuisine.name.toLowerCase() + " food"
    )}`
  }

  // Add more detailed logging at component mount
  useEffect(() => {
    console.log("Recipe image details:", {
      imageUrl: recipe.image_url,
      image: recipe.image,
      name: recipe.name,
      hasImageUrl: !!recipe.image_url,
      hasImage: !!recipe.image,
      fallbackUrl: getFallbackImageUrl(recipe.name)
    })
  }, [recipe])

  const { data: recipeDetails, refetch } = useQuery({
    queryKey: ["recipe", recipe.id],
    queryFn: async () => {
      const response = await fetch(`${config.apiBaseUrl}/api/cultural-recipes/${recipe.id}`, {
        credentials: "include"
      })
      if (!response.ok) {
        throw new Error("Failed to fetch recipe details")
      }
      return response.json()
    },
    initialData: recipe
  })

  const fetchPairings = async () => {
    if (!recipe || !cuisine) return
    setLoading(true)
    try {
      console.log("Fetching pairings for:", recipe.name)
      const data = await getPairings(recipe, cuisine)
      console.log("Pairings response:", data)

      if (data) {
        setPairings({
          mainDishes: data.mainDishes || [],
          sideDishes: data.sideDishes || [],
          desserts: data.desserts || [],
          beverages: data.beverages || []
        })
      }
    } catch (error) {
      console.error("Error fetching pairings:", error)
      toast("Error", {
        description: "Could not load complementary dishes. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchEtiquette = async () => {
    if (!recipe || !cuisine) return
    setLoading(true)
    try {
      console.log("Fetching etiquette for:", recipe.name)
      const etiquetteData = await getEtiquette(recipe, cuisine)

      console.log("Etiquette response:", etiquetteData)

      if (etiquetteData) {
        setEtiquette({
          presentation: etiquetteData.presentation || [],
          customs: etiquetteData.customs || [],
          taboos: etiquetteData.taboos || [],
          servingOrder: etiquetteData.servingOrder || []
        })
      }
    } catch (error) {
      console.error("Error fetching etiquette:", error)
      toast("Error", {
        description: "Could not load serving etiquette. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTechniqueTips = async () => {
    if (!recipe || !cuisine || techniqueTips.length > 0) return
    setIsAnalyzing(true)
    try {
      // For demo purposes, create a mock technique from the recipe
      const mockTechnique = {
        id: 0,
        name: recipe.name,
        description: recipe.description,
        difficulty: recipe.difficulty,
        steps: [],
        tips: [],
        cuisineId: cuisine.id,
        createdAt: new Date(),
        commonUses: {},
        videoUrl: null
      }
      const tips = await getTechniqueTips(mockTechnique, cuisine)
      setTechniqueTips([tips])
    } catch (error) {
      toast("Error", {
        description: "Failed to load technique tips. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleUpdateRecipe = async (updatedData, showErrorToast = true) => {
    try {
      // Format the data for the API
      const formattedData = {
        ...updatedData,
        instructions: Array.isArray(updatedData.instructions)
          ? Object.fromEntries(
              updatedData.instructions.map((inst, i) => [i.toString(), inst])
            )
          : updatedData.instructions,
        authenticIngredients: Array.isArray(updatedData.authenticIngredients)
          ? Object.fromEntries(
              updatedData.authenticIngredients.map((ing, i) => [
                i.toString(),
                ing
              ])
            )
          : updatedData.authenticIngredients
      }

      const response = await fetch(`${config.apiBaseUrl}/api/cultural-recipes/${recipe.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      })

      if (!response.ok) {
        throw new Error("Failed to update recipe")
      }

      await refetch()

      toast("Recipe Updated", {
        description: "Recipe details have been updated successfully."
      })
    } catch (error) {
      console.error("Error updating recipe:", error)
      if (showErrorToast) {
        toast("Error", {
          description: "Failed to update recipe. Please try again.",
          variant: "destructive"
        })
      }
      throw error // Re-throw the error so it can be caught by the caller
    }
  }

  const currentUserId = user?.id

  const handleDeleteRecipe = async () => {
    try {
      if (!currentUserId) {
        throw new Error("You must be logged in to delete recipes")
      }

      console.log(
        `[Delete] Attempting to hide/delete recipe ${recipe.id} by user ${currentUserId}`
      )
      const response = await fetch(`${config.apiBaseUrl}/api/cultural-recipes/${recipe.id}/hide`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache"
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[Delete] Server error:", errorData)
        throw new Error(
          errorData.details || errorData.message || "Failed to process recipe"
        )
      }

      const result = await response.json()
      console.log("[Delete] Server response:", result)

      // Update localStorage for non-creators (hide)
      if (result.type === "hidden") {
        const hiddenRecipes = JSON.parse(
          localStorage.getItem("hiddenRecipes") || "[]"
        )
        if (!hiddenRecipes.includes(recipe.id)) {
          hiddenRecipes.push(recipe.id)
          localStorage.setItem("hiddenRecipes", JSON.stringify(hiddenRecipes))
          console.log(
            `[Delete] Updated hidden recipes in localStorage:`,
            hiddenRecipes
          )
        }
      }

      toast(result.type === "deleted" ? "Recipe Deleted" : "Recipe Hidden", {
        description:
          result.type === "deleted"
            ? "The recipe has been permanently deleted."
            : "The recipe has been hidden from your view."
      })

      // Clear all related queries to force a fresh fetch
      queryClient.removeQueries({ queryKey: ["recipe", recipe.id] })
      queryClient.removeQueries({ queryKey: ["recipes"] })
      queryClient.removeQueries({ queryKey: ["cuisine", cuisine.id] })

      // Navigate back to cuisine view
      onBack()
    } catch (error) {
      console.error("[Delete] Error:", error)
      toast.error("Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to process recipe. Please try again."
      })
    }
  }

  // Update button labels and dialogs based on content existence
  const hasInstructions = Array.isArray(recipeDetails.instructions)
    ? recipeDetails.instructions.length > 0
    : recipeDetails.instructions &&
      Object.keys(recipeDetails.instructions).length > 0
  const hasIngredients = Array.isArray(recipeDetails.authenticIngredients)
    ? recipeDetails.authenticIngredients.length > 0
    : recipeDetails.authenticIngredients &&
      Object.keys(recipeDetails.authenticIngredients).length > 0
  const hasNotes =
    recipeDetails.culturalNotes &&
    Object.keys(recipeDetails.culturalNotes).length > 0

  const generateAIDetails = async () => {
    setIsGenerating(true)
    try {
      const details = await generateCulturalRecipeDetails(
        recipe.name,
        cuisine.name
      )

      // Convert ingredients to comma-separated list
      const ingredients = details.ingredients
        .map(
          ing =>
            `${ing.amount} ${ing.item}${ing.notes ? ` (${ing.notes})` : ""}`
        )
        .join(", ")

      // Update form fields
      const form = document.querySelector("form")
      if (form) {
        const ingredientsTextarea = form.querySelector('[name="ingredients"]')
        const instructionsTextarea = form.querySelector('[name="instructions"]')

        if (ingredientsTextarea) {
          ingredientsTextarea.value = ingredients
        }
        if (instructionsTextarea) {
          instructionsTextarea.value = details.instructions
            .map(stripStepPrefix)
            .join("\n")
        }
      }

      toast("Recipe Details Generated", {
        description: "AI has generated recipe details. Feel free to edit them."
      })
    } catch (error) {
      toast("Generation Failed", {
        description:
          "Failed to generate recipe details. Please try again or enter manually.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="space-y-4">
          <div className="flex items-center gap-4 justify-between">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {cuisine.name} Cuisine
            </Button>
          </div>

          <div className="grid gap-2">
            {/* Recipe Header Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">{recipe.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{recipe.description}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      recipe.difficulty === "beginner"
                        ? "default"
                        : recipe.difficulty === "intermediate"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {recipe.difficulty}
                  </Badge>
                </div>

                {/* Recipe Image with enhanced styling */}
                <div className="relative aspect-[16/6] w-full overflow-hidden rounded-lg">
                  {recipeDetails.image_url ? (
                    <img
                      src={recipeDetails.image_url}
                      alt={recipeDetails.name}
                      className="object-cover w-full h-full"
                      onError={e => {
                        e.currentTarget.src = getFallbackImageUrl(
                          recipeDetails.name
                        )
                      }}
                    />
                  ) : (
                    <img
                      src={getFallbackImageUrl(recipeDetails.name)}
                      alt={recipeDetails.name}
                      className="object-cover w-full h-full"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
                </div>
              </CardContent>
            </Card>

            {/* Location/Region Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <MapPin className="h-4 w-4 text-white/90" />
              <span className="text-sm font-medium text-white/90">
                {cuisine.region}
              </span>
            </div>

            {/* Tabs Content */}
            <div className="mt-2">
              <Tabs defaultValue="instructions" className="w-full">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                  <TabsTrigger value="ingredients">
                    Ingredients & Cultural
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="instructions">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold mt-2 mb-4">Steps</h3>
                    
                  </div>
                  <ol className="space-y-2">
                    {Array.isArray(recipe.instructions)
                      ? recipe.instructions.map((step, i) => (
                          <li key={i} className="flex gap-4 items-start">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div>{stripStepPrefix(step)}</div>
                          </li>
                        ))
                      : recipe.instructions &&
                        typeof recipe.instructions === "object"
                      ? Object.values(recipe.instructions).map((step, i) => (
                          <li key={i} className="flex gap-4 items-start">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div>{stripStepPrefix(step)}</div>
                          </li>
                        ))
                      : null}
                  </ol>
                </TabsContent>

                <TabsContent value="ingredients">
                  <div className="space-y-4 mt-2">
                    {/* Authentic Ingredients Section */}
                    <div>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">
                          Authentic Ingredients
                        </h3>
                      </div>
                      <ul className="space-y-3 mt-4">
                        {Array.isArray(recipe.authenticIngredients)
                          ? recipe.authenticIngredients.map((ingredient, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="h-4 w-4 text-primary" />
                                  <span className="font-medium">
                                    {ingredient}
                                  </span>
                                </div>
                              </li>
                            ))
                          : recipe.authenticIngredients &&
                            typeof recipe.authenticIngredients === "object"
                          ? Object.entries(recipe.authenticIngredients).map(
                              ([name, quantity], i) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 text-primary" />
                                    <span className="font-medium">
                                      {name}: {quantity}
                                    </span>
                                  </div>
                                </li>
                              )
                            )
                          : null}
                      </ul>
                    </div>

                    {/* Complementary Dishes Card */}
                    <Card className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/50 border-b">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-primary" />
                            Complementary Dishes
                          </CardTitle>
                          <CardDescription>
                            Traditional pairings and accompaniments
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchPairings}
                          disabled={loading}
                          className="ml-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Show Pairings
                            </>
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent className="p-6">
                        {pairings ? (
                          <div className="grid gap-6 md:grid-cols-2">
                            {pairings.mainDishes.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border bg-card">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <ChefHat className="h-4 w-4 text-primary" />
                                  Main Dishes
                                </h4>
                                <ul className="space-y-2">
                                  {pairings.mainDishes.map((dish, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2"
                                    >
                                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <span>{dish}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {pairings.sideDishes.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border bg-card">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
                                  Side Dishes
                                </h4>
                                <ul className="space-y-2">
                                  {pairings.sideDishes.map((dish, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2"
                                    >
                                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <span>{dish}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {pairings.desserts.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border bg-card">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-amber-500" />
                                  Desserts
                                </h4>
                                <ul className="space-y-2">
                                  {pairings.desserts.map((dish, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2"
                                    >
                                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <span>{dish}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {pairings.beverages.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border bg-card">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Wine className="h-4 w-4 text-indigo-500" />
                                  Beverages
                                </h4>
                                <ul className="space-y-2">
                                  {pairings.beverages.map((beverage, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2"
                                    >
                                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <span>{beverage}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="rounded-full bg-primary/10 p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                              <UtensilsCrossed className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Click "Show Pairings" to discover traditional dish
                              combinations
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Serving Etiquette Card */}
                    <Card className="overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/50 border-b">
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Globe2 className="h-4 w-4 text-primary" />
                            Serving Etiquette
                          </CardTitle>
                          <CardDescription>
                            Cultural dining customs and traditions
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={fetchEtiquette}
                          disabled={loading}
                          className="ml-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              {etiquette
                                ? "Generate New Etiquette"
                                : "Generate Etiquette"}
                            </>
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent className="p-6">
                        {etiquette ? (
                          <div className="grid gap-6 md:grid-cols-2">
                            {etiquette.taboos.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                  <strong>Cultural Taboos</strong>
                                </h4>
                                <ul className="space-y-2">
                                  {etiquette.taboos.map((taboo, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2 p-3 rounded-md hover:bg-muted/60 transition-colors"
                                    >
                                      <Ban className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                      <span>{taboo}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {etiquette.customs.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Scroll className="h-4 w-4 text-amber-600" />
                                  <strong>Traditional Customs</strong>
                                </h4>
                                <ul className="space-y-2">
                                  {etiquette.customs.map((custom, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2 p-3 rounded-md hover:bg-muted/60 transition-colors"
                                    >
                                      <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                      <span>{custom}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {etiquette.presentation.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Palette className="h-4 w-4 text-emerald-600" />
                                  <strong>Table Setting & Presentation</strong>
                                </h4>
                                <ul className="space-y-2">
                                  {etiquette.presentation.map((tip, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2 p-3 rounded-md hover:bg-muted/60 transition-colors"
                                    >
                                      <ChefHat className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                      <span>{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {etiquette.servingOrder.length > 0 && (
                              <div className="space-y-3 p-4 rounded-lg border">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <ListOrdered className="h-4 w-4 text-blue-600" />
                                  <strong>Serving Order</strong>
                                </h4>
                                <ul className="space-y-2">
                                  {etiquette.servingOrder.map((step, i) => (
                                    <li
                                      key={i}
                                      className="text-sm flex items-start gap-2 p-3 rounded-md hover:bg-muted/60 transition-colors"
                                    >
                                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                          {i + 1}
                                        </span>
                                      </div>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="rounded-full bg-primary/10 p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                              <Globe2 className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Click "Add Etiquette" to add cultural dining
                              customs
                            </p>
                          </div>
                        )}
                        {culturalContext && (
                          <Card className="mt-6 overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/50 border-b">
                              <div>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                  <Globe2 className="h-4 w-4 text-primary" />
                                  Cultural Context & History
                                </CardTitle>
                                <CardDescription>
                                  Traditional background and significance
                                </CardDescription>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6">
                              <div className="grid gap-6 md:grid-cols-2">
                                {culturalContext.history && (
                                  <div className="space-y-3 p-4 rounded-lg border">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                      <History className="h-4 w-4 text-blue-600" />
                                      <strong>Historical Background</strong>
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {culturalContext.history}
                                    </p>
                                  </div>
                                )}

                                {culturalContext.significance && (
                                  <div className="space-y-3 p-4 rounded-lg border">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                      <Star className="h-4 w-4 text-amber-600" />
                                      <strong>Cultural Significance</strong>
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {culturalContext.significance}
                                    </p>
                                  </div>
                                )}

                                {culturalContext.variations && (
                                  <div className="space-y-3 p-4 rounded-lg border">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                      <Map className="h-4 w-4 text-purple-600" />
                                      <strong>Regional Variations</strong>
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {culturalContext.variations}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Edit Instructions Dialog */}
        <Dialog
          open={isEditingInstructions}
          onOpenChange={setIsEditingInstructions}
        >
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {hasInstructions
                  ? "Edit Recipe Instructions"
                  : "Add Recipe Instructions"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="p-6">
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const instructionsText = formData.get("instructions")
                    const instructions = instructionsText
                      .split("\n")
                      .map(line => stripStepPrefix(line))
                      .filter(Boolean)
                    handleUpdateRecipe({ instructions })
                    setIsEditingInstructions(false)
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">
                        Instructions
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAIDetails}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-green-500" />
                        )}
                        <span className="ml-2">Generate</span>
                      </Button>
                    </div>
                    <Textarea
                      name="instructions"
                      defaultValue={
                        Array.isArray(recipeDetails.instructions)
                          ? recipeDetails.instructions
                              .map(stripStepPrefix)
                              .join("\n")
                          : Object.values(
                              recipeDetails.instructions || {}
                            )
                              .map(stripStepPrefix)
                              .join("\n")
                      }
                      placeholder="Enter each step on a new line"
                      rows={10}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter each step on a new line. For example:
                      {"\nChop the vegetables\nHeat oil in a pan\nAdd spices"}
                    </p>
                  </div>
                  <Button type="submit" className="w-full">
                    {hasInstructions ? "Save Instructions" : "Add Instructions"}
                  </Button>
                </form>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-2">
              <Button onClick={() => setIsEditingInstructions(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Ingredients Dialog */}
        <Dialog
          open={isEditingIngredients}
          onOpenChange={setIsEditingIngredients}
        >
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {hasIngredients
                  ? "Edit Authentic Ingredients"
                  : "Add Authentic Ingredients"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="p-6">
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const ingredientsText = formData.get("ingredients")
                    const ingredients = ingredientsText
                      .split(",")
                      .map(i => i.trim())
                      .filter(Boolean)
                    handleUpdateRecipe({ authenticIngredients: ingredients })
                    setIsEditingIngredients(false)
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Ingredients</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAIDetails}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span className="ml-2">Generate</span>
                      </Button>
                    </div>
                    <Textarea
                      name="ingredients"
                      defaultValue={
                        Array.isArray(recipeDetails.authenticIngredients)
                          ? recipeDetails.authenticIngredients.join(", ")
                          : Object.keys(
                              recipeDetails.authenticIngredients || {}
                            ).join(", ")
                      }
                      placeholder="Enter ingredients separated by commas"
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter ingredients separated by commas. For example:
                      {"\nrice, ginger, soy sauce, sesame oil"}
                    </p>
                  </div>
                  <Button type="submit" className="w-full">
                    {hasIngredients ? "Save Ingredients" : "Add Ingredients"}
                  </Button>
                </form>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-2">
              <Button onClick={() => setIsEditingIngredients(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

