import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import {
  Plus,
  CalendarIcon,
  Trash2,
  AlertTriangle,
  Clock,
  Coffee,
  UtensilsCrossed,
  ChefHat,
  Apple,
  Sparkles
} from "lucide-react"
import { CreateMealPlanDialog } from "./create-meal-plan-dialog"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export function MealPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ["/api/meal-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/meal-plans")
      return res.json()
    }
  })

  const { data: currentGoal } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    }
  })

  const deleteMealPlanMutation = useMutation({
    mutationFn: async id => {
      await apiRequest("DELETE", `/api/meal-plans/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] })
      setActiveMealPlan(null)
      toast({
        title: "Success",
        description: "Meal plan deleted successfully."
      })
    }
  })

  const createMutation = useMutation({
    mutationFn: async data => {
      const res = await apiRequest("POST", "/api/meal-plans", data)
      const newPlan = await res.json()

      // Update nutrition progress for each meal
      const nutritionUpdates = newPlan.meals.map(async day => {
        const date = new Date(newPlan.startDate)
        date.setDate(date.getDate() + (day.day - 1))

        const dailyNutrition = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }

        // Sum up nutrition from all meals
        Object.values(day.meals).forEach(meal => {
          if (Array.isArray(meal)) {
            // Handle snacks array
            meal.forEach(snack => {
              const nutrition = parseNutritionString(snack.nutritionalInfo)
              dailyNutrition.calories += nutrition.calories
              dailyNutrition.protein += nutrition.protein
              dailyNutrition.carbs += nutrition.carbs
              dailyNutrition.fat += nutrition.fat
            })
          } else {
            // Handle single meals (breakfast, lunch, dinner)
            const nutrition = parseNutritionString(meal.nutritionalInfo)
            dailyNutrition.calories += nutrition.calories
            dailyNutrition.protein += nutrition.protein
            dailyNutrition.carbs += nutrition.carbs
            dailyNutrition.fat += nutrition.fat
          }
        })

        await apiRequest("POST", "/api/nutrition-goals/progress", {
          progress: {
            date: date.toISOString().split("T")[0],
            ...dailyNutrition,
            completed: true
          }
        })
      })

      await Promise.all(nutritionUpdates)
      return newPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] })
      queryClient.invalidateQueries({
        queryKey: ["/api/nutrition-goals/current"]
      })
      setShowCreateDialog(false)
      toast({
        title: "Success",
        description: "Meal plan created and nutrition goals updated."
      })
    }
  })

  const activeMealPlan = mealPlans?.find(plan => {
    const start = new Date(plan.startDate)
    const end = new Date(plan.endDate)
    return selectedDate >= start && selectedDate <= end
  })

  const selectedDayMeals = activeMealPlan?.meals?.find(
    day =>
      day.day ===
      Math.floor(
        (selectedDate.getTime() -
          new Date(activeMealPlan.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) +
        1
  )

  // Helper function to parse nutrition string
  const parseNutritionString = nutritionStr => {
    const defaults = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    try {
      const matches = {
        calories: nutritionStr.match(/(\d+)\s*kcal/),
        protein: nutritionStr.match(/(\d+)g\s*protein/),
        carbs: nutritionStr.match(/(\d+)g\s*carbs/),
        fat: nutritionStr.match(/(\d+)g\s*fat/)
      }

      return {
        calories: matches.calories
          ? parseInt(matches.calories[1])
          : defaults.calories,
        protein: matches.protein
          ? parseInt(matches.protein[1])
          : defaults.protein,
        carbs: matches.carbs ? parseInt(matches.carbs[1]) : defaults.carbs,
        fat: matches.fat ? parseInt(matches.fat[1]) : defaults.fat
      }
    } catch (e) {
      return defaults
    }
  }

  // Add nutrition warning if exceeding goals
  const renderNutritionWarning = meals => {
    if (!currentGoal) return null

    const dailyNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    }

    // Calculate total nutrition
    Object.values(meals).forEach(meal => {
      if (Array.isArray(meal)) {
        meal.forEach(snack => {
          const nutrition = parseNutritionString(snack.nutritionalInfo)
          dailyNutrition.calories += nutrition.calories
          dailyNutrition.protein += nutrition.protein
          dailyNutrition.carbs += nutrition.carbs
          dailyNutrition.fat += nutrition.fat
        })
      } else {
        const nutrition = parseNutritionString(meal.nutritionalInfo)
        dailyNutrition.calories += nutrition.calories
        dailyNutrition.protein += nutrition.protein
        dailyNutrition.carbs += nutrition.carbs
        dailyNutrition.fat += nutrition.fat
      }
    })

    const exceeds = {
      calories: dailyNutrition.calories > currentGoal.dailyCalories,
      protein: dailyNutrition.protein > currentGoal.dailyProtein,
      carbs: dailyNutrition.carbs > currentGoal.dailyCarbs,
      fat: dailyNutrition.fat > currentGoal.dailyFat
    }

    if (Object.values(exceeds).some(val => val)) {
      return (
        <Alert variant="warning" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Exceeds daily goals:</span>
            <div className="flex gap-2 mt-2">
              {exceeds.calories && (
                <Badge variant="outline" className="text-yellow-500">
                  Calories +
                  {dailyNutrition.calories - currentGoal.dailyCalories}
                </Badge>
              )}
              {exceeds.protein && (
                <Badge variant="outline" className="text-yellow-500">
                  Protein +{dailyNutrition.protein - currentGoal.dailyProtein}g
                </Badge>
              )}
              {exceeds.carbs && (
                <Badge variant="outline" className="text-yellow-500">
                  Carbs +{dailyNutrition.carbs - currentGoal.dailyCarbs}g
                </Badge>
              )}
              {exceeds.fat && (
                <Badge variant="outline" className="text-yellow-500">
                  Fat +{dailyNutrition.fat - currentGoal.dailyFat}g
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Meal Planner</h1>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Meal Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 border border-border shadow-sm">
          <div className="flex flex-col items-center">
            <div className="w-full max-w-sm mx-auto">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => date && setSelectedDate(date)}
                className="mx-auto rounded-md bg-card"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-border shadow-sm relative overflow-hidden">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ) : selectedDayMeals ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="font-medium">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </span>
                </div>
                {activeMealPlan && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meal Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this meal plan? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            deleteMealPlanMutation.mutate(activeMealPlan.id)
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="grid gap-4">
                <MealCard
                  title="Breakfast"
                  meal={selectedDayMeals.meals.breakfast}
                  className="bg-orange-50/50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900"
                  icon={<Coffee className="h-4 w-4 text-orange-500" />}
                />
                <MealCard
                  title="Lunch"
                  meal={selectedDayMeals.meals.lunch}
                  className="bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                  icon={<UtensilsCrossed className="h-4 w-4 text-green-500" />}
                />
                <MealCard
                  title="Dinner"
                  meal={selectedDayMeals.meals.dinner}
                  className="bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                  icon={<ChefHat className="h-4 w-4 text-blue-500" />}
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Apple className="h-4 w-4 text-purple-500" />
                  <h3 className="font-semibold">Snacks</h3>
                </div>
                <div className="grid gap-2">
                  {selectedDayMeals.meals.snacks.map((snack, index) => (
                    <MealCard
                      key={index}
                      meal={snack}
                      className="bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Daily Summary</p>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-primary/10">
                    {selectedDayMeals.totalCalories} calories
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedDayMeals.nutritionSummary}
                </p>
              </div>

              {selectedDayMeals &&
                renderNutritionWarning(selectedDayMeals.meals)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                No meal plan for this date.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
              >
                Create New Plan
              </Button>
            </div>
          )}
        </Card>
      </div>

      <CreateMealPlanDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}

function MealCard({ title, meal, className = "", icon }) {
  // Extract preparation time for formatted display
  const getPrepTime = prepTime => {
    if (!prepTime) return null
    return prepTime
  }

  // Process nutritional info to ensure better readability
  const formatNutritionalInfo = nutritionalInfo => {
    // If there's no proper nutritional info, provide basic info
    if (!nutritionalInfo || nutritionalInfo.trim() === "") {
      return "No detailed nutritional info"
    }

    return nutritionalInfo
  }

  return (
    <Card
      className={`p-4 border shadow-sm transition-all hover:shadow-md ${className}`}
    >
      <div className="space-y-2">
        {title && (
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <h3 className="font-semibold">{title}</h3>
          </div>
        )}
        <div>
          <h4 className="font-medium text-base">{meal.title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{meal.description}</p>
        <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatNutritionalInfo(meal.nutritionalInfo)}
          </span>
          {meal.preparationTime && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{getPrepTime(meal.preparationTime)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
