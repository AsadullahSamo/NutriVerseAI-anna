import React, { useEffect, useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import {
  Clock,
  Users,
  ListOrdered,
  Utensils,
  Loader2,
  Leaf
} from "lucide-react"
import { NutritionDisplay } from "@/components/nutrition-display"
import { RecipeActions } from "./recipe-actions"
import { MoodTracker } from "./mood-tracker"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

export function RecipeCard({
  recipe,
  compact = false,
  showDelete = false,
  hideEditDelete = false
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const [showConsumeDialog, setShowConsumeDialog] = React.useState(false)
  const [servings, setServings] = React.useState(1)
  const [mealType, setMealType] = React.useState("snack")
  const [showNutritionWarning, setShowNutritionWarning] = React.useState(false)
  const [exceededNutrients, setExceededNutrients] = React.useState(null)
  const [localImageUrl, setLocalImageUrl] = useState(null)

  useEffect(() => {
    // Try to get image URL from localStorage first
    const storedImageUrl = localStorage.getItem(`recipe-image-${recipe.id}`)
    if (storedImageUrl) {
      setLocalImageUrl(storedImageUrl)
    }
  }, [recipe.id])

  // Ensure sustainabilityScore always has a value, defaulting to 50 if not set
  const sustainabilityScore = recipe.sustainabilityScore ?? 50

  const { data: currentGoal } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    }
  })

  const { data: todayProgress } = useQuery({
    queryKey: ["nutrition-progress", new Date().toISOString().split("T")[0]],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/progress/today")
      return res.json()
    },
    enabled: !!currentGoal
  })

  const checkNutritionLimits = () => {
    if (!currentGoal || !todayProgress) return { exceedsLimits: false }

    const nutritionInfo = recipe.nutritionInfo
    const totalNutrition = {
      calories: todayProgress.calories + nutritionInfo.calories * servings,
      protein: todayProgress.protein + nutritionInfo.protein * servings,
      carbs: todayProgress.carbs + nutritionInfo.carbs * servings,
      fat: todayProgress.fat + nutritionInfo.fat * servings
    }

    const exceedances = {
      calories: totalNutrition.calories > currentGoal.dailyCalories,
      protein: totalNutrition.protein > currentGoal.dailyProtein,
      carbs: totalNutrition.carbs > currentGoal.dailyCarbs,
      fat: totalNutrition.fat > currentGoal.dailyFat
    }

    return {
      exceedsLimits: Object.values(exceedances).some(v => v),
      exceededNutrients: Object.entries(exceedances)
        .filter(([_, exceeds]) => exceeds)
        .map(([nutrient]) => ({
          name: nutrient,
          current: totalNutrition[nutrient],
          limit:
            currentGoal[
              `daily${nutrient.charAt(0).toUpperCase() + nutrient.slice(1)}`
            ]
        }))
    }
  }

  const handleConsume = () => {
    const { exceedsLimits, exceededNutrients } = checkNutritionLimits()
    if (exceedsLimits) {
      setExceededNutrients(exceededNutrients)
      setShowNutritionWarning(true)
    } else {
      consumeMutation.mutate()
    }
  }

  const consumeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/recipes/${recipe.id}/consume`, {
        servings,
        mealType
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/nutrition-goals/current"]
      })
      queryClient.invalidateQueries({
        queryKey: ["/api/recipes/consumption-history"]
      })
      setShowConsumeDialog(false)
      toast({
        title: "Recipe consumed!",
        description: "Your nutrition progress has been updated."
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/recipes/${recipe.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] })
      toast({
        title: "Recipe deleted",
        description: "Recipe has been deleted successfully."
      })
    }
  })

  const onDelete = () => {
    deleteMutation.mutate()
  }

  // Helper function to get sustainability color
  const getSustainabilityColor = score => {
    if (score >= 70) return "bg-green-500/10 text-green-600 dark:text-green-400"
    if (score >= 40)
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
    return "bg-red-500/10 text-red-600 dark:text-red-400"
  }

  return (
    <>
      <Card className="flex flex-col h-full">
        <div className="flex-1 flex flex-col">
          {/* Show RecipeActions when not hideEditDelete */}
          {!hideEditDelete && !compact && (
            <div className="border-b bg-secondary/10">
              <div className="px-2 py-1">
                <RecipeActions
                  recipe={recipe}
                  size="sm"
                  showDelete={showDelete}
                  // Remove the hardcoded true to restore edit/delete buttons
                  hideEditDelete={hideEditDelete}
                />
              </div>
            </div>
          )}

          {/* Main card content */}
          <div className="flex-1 flex flex-col">
            <CardHeader className="p-5">
              {(localImageUrl || recipe.imageUrl) && !compact && (
                <div className="relative aspect-[16/9] -mx-5 -mt-5 mb-5">
                  <img
                    src={localImageUrl || recipe.imageUrl}
                    alt={recipe.title}
                    className="object-cover w-full h-full"
                    onError={e => {
                      e.currentTarget.src = `https://source.unsplash.com/1200x800/?${encodeURIComponent(
                        recipe.title.toLowerCase() + " food"
                      )}`
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-lg tracking-tight">
                      {recipe.title}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Leaf className="h-3 w-3" />
                        Sustainability
                      </span>
                    </span>
                    <div
                      className={`px-2.5 py-1 rounded-md mt-0.5 text-sm ${getSustainabilityColor(
                        sustainabilityScore
                      )}`}
                    >
                      <span className="font-medium">
                        {sustainabilityScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Show description in both compact and regular mode */}
                {recipe.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {recipe.description}
                  </p>
                )}
              </div>
            </CardHeader>

            {/* Recipe metadata */}
            <div className="px-4 py-2.5 border-t bg-muted/5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span className="whitespace-nowrap">
                    {recipe.prepTime} min
                  </span>
                </div>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      className="p-0 h-auto hover:bg-transparent"
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>
                          {recipe.ingredients.length === 1
                            ? "1 item"
                            : `${recipe.ingredients.length} items`}
                        </span>
                      </span>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-card border-border shadow-lg">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-primary border-b pb-2">
                        Ingredients
                      </h4>
                      <ul className="list-disc pl-4 space-y-1.5 max-h-[200px] overflow-y-auto pr-2">
                        {recipe.ingredients.map((ingredient, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground"
                          >
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </HoverCardContent>
                </HoverCard>

                {recipe.instructions && recipe.instructions.length > 0 && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto hover:bg-transparent"
                      >
                        <span className="flex items-center gap-1.5">
                          <ListOrdered className="h-4 w-4" />
                          <span>
                            {recipe.instructions.length === 1
                              ? "1 step"
                              : `${recipe.instructions.length} steps`}{" "}
                          </span>
                        </span>
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 bg-card border-border shadow-lg">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-primary border-b pb-2">
                          Instructions
                        </h4>
                        <ol className="list-decimal pl-4 space-y-1.5 max-h-[250px] overflow-y-auto pr-2">
                          {recipe.instructions.map((instruction, index) => (
                            <li
                              key={index}
                              className="text-sm text-muted-foreground flex gap-2"
                            >
                              <span className="min-w-[1.5rem]">{index + 1}.</span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>
            </div>

            {/* Nutrition info - show in both compact and regular mode */}
            <div className="p-4 border-t">
              <NutritionDisplay nutrition={recipe.nutritionInfo} />
            </div>

            {/* Additional sections for non-compact view */}
            {!compact && !hideEditDelete && (
              <>
                <div className="p-4 border-t bg-card">
                  <MoodTracker recipeId={recipe.id} />
                </div>
                <div className="p-4 border-t mt-auto">
                  <Button
                    variant="ghost"
                    onClick={() => setShowConsumeDialog(true)}
                    className="w-full hover:bg-primary/10 text-muted-foreground"
                    title="Log this meal"
                  >
                    <Utensils className="h-4 w-4 mr-2" />
                    Consume
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={showConsumeDialog} onOpenChange={setShowConsumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <div className="relative">
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="navbar-dropdown-trigger capitalize"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Servings</Label>
              <Input
                type="number"
                value={servings}
                onChange={e =>
                  setServings(Math.max(1, parseInt(e.target.value) || 1))
                }
                min="1"
              />
            </div>
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={handleConsume}
                disabled={consumeMutation.isPending}
              >
                {consumeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Log Meal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={showNutritionWarning}
        onOpenChange={setShowNutritionWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <AlertDialogTitle>Exceeds Daily Goals</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div>
                  Adding this meal will exceed your daily nutrition goals:
                </div>
                <div className="space-y-2">
                  {exceededNutrients?.map(nutrient => (
                    <div
                      key={nutrient.name}
                      className="flex justify-between text-sm"
                    >
                      <span className="capitalize">{nutrient.name}</span>
                      <span className="text-yellow-500">
                        {nutrient.current} / {nutrient.limit}
                        {nutrient.name === "calories" ? " kcal" : "g"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="font-medium">
                  Would you like to proceed anyway?
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNutritionWarning(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowNutritionWarning(false)
                consumeMutation.mutate()
              }}
            >
              Log Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
