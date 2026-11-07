import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { ChartJSLineChart as LineChart } from "@/components/ui/chartjs-chart"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { format, startOfWeek, startOfMonth, eachDayOfInterval } from "date-fns"
import { Loader2, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function NutritionSummary() {
  const [period, setPeriod] = React.useState("week")
  const [mealType, setMealType] = React.useState("all")

  const { data: currentGoal, isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    }
  })

  const { data: consumptionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/recipes/consumption-history", period, mealType], // Add mealType to queryKey
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: getDateRange().start.toISOString(),
        endDate: getDateRange().end.toISOString(),
        mealType: mealType // Add mealType to API request
      })
      const res = await apiRequest(
        "GET",
        `/api/recipes/consumption-history?${params}`
      )
      return res.json()
    }
  })

  const isLoading = goalsLoading || historyLoading

  const getDateRange = () => {
    const today = new Date()
    if (period === "week") {
      return {
        start: startOfWeek(today),
        end: today
      }
    }
    return {
      start: startOfMonth(today),
      end: today
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!currentGoal?.progress) return null

  const { start, end } = getDateRange()
  const dateRange = eachDayOfInterval({ start, end })

  // Filter and aggregate data by meal type
  const filteredProgressData = dateRange.map(date => {
    const dateStr = format(date, "yyyy-MM-dd")

    // Get consumption for this date filtered by meal type
    const dayConsumption = (consumptionHistory || [])
      .filter(c => {
        const consumed =
          new Date(c.consumedAt).toDateString() === date.toDateString()
        return mealType === "all"
          ? consumed
          : consumed && c.mealType === mealType
      })
      .reduce(
        (acc, curr) => {
          const recipe = curr.recipe?.nutritionInfo || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
          }
          return {
            calories: acc.calories + recipe.calories * curr.servings,
            protein: acc.protein + recipe.protein * curr.servings,
            carbs: acc.carbs + recipe.carbs * curr.servings,
            fat: acc.fat + recipe.fat * curr.servings
          }
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )

    return {
      date: format(date, "MMM dd"),
      calories: dayConsumption.calories,
      protein: dayConsumption.protein,
      carbs: dayConsumption.carbs,
      fat: dayConsumption.fat,
      targetCalories:
        mealType === "all"
          ? currentGoal.dailyCalories
          : Math.round(currentGoal.dailyCalories / 3),
      targetProtein:
        mealType === "all"
          ? currentGoal.dailyProtein
          : Math.round(currentGoal.dailyProtein / 3),
      targetCarbs:
        mealType === "all"
          ? currentGoal.dailyCarbs
          : Math.round(currentGoal.dailyCarbs / 3),
      targetFat:
        mealType === "all"
          ? currentGoal.dailyFat
          : Math.round(currentGoal.dailyFat / 3)
    }
  })

  // Calculate averages
  const averages = filteredProgressData.reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const days = filteredProgressData.length
  Object.keys(averages).forEach(key => {
    averages[key] = Math.round(averages[key] / days)
  })

  // Calculate meal type distribution
  const mealDistribution = (consumptionHistory || []).reduce((acc, curr) => {
    acc[curr.mealType] = (acc[curr.mealType] || 0) + 1
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {period === "week" ? "Weekly" : "Monthly"} Summary
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="navbar-dropdown-trigger w-32"
          >
            <option value="all">All Meals</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snacks</option>
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="navbar-dropdown-trigger w-32"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{averages.calories}</div>
              <p className="text-xs text-muted-foreground">Avg. Calories</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(
                  (averages.calories / currentGoal.dailyCalories) * 100
                )}
                % of goal
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{averages.protein}g</div>
              <p className="text-xs text-muted-foreground">Avg. Protein</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(
                  (averages.protein / currentGoal.dailyProtein) * 100
                )}
                % of goal
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{averages.carbs}g</div>
              <p className="text-xs text-muted-foreground">Avg. Carbs</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((averages.carbs / currentGoal.dailyCarbs) * 100)}%
                of goal
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{averages.fat}g</div>
              <p className="text-xs text-muted-foreground">Avg. Fat</p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((averages.fat / currentGoal.dailyFat) * 100)}% of
                goal
              </p>
            </CardContent>
          </Card>
        </div>

        {consumptionHistory && consumptionHistory.length > 0 ? (
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3">Meal Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(mealDistribution).map(([type, count]) => (
                <Button
                  key={type}
                  variant={mealType === type ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setMealType(type)}
                >
                  <span className="capitalize">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </Button>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No meal consumption data available for this period.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Calories Trend</h4>
            <LineChart
              data={filteredProgressData}
              categories={["calories", "targetCalories"]}
              index="date"
              colors={["#f97316", "#94a3b8"]}
              valueFormatter={value => `${value} kcal`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Protein</h4>
              <LineChart
                data={filteredProgressData}
                categories={["protein", "targetProtein"]}
                index="date"
                colors={["#22c55e", "#94a3b8"]}
                valueFormatter={value => `${value}g`}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Carbs</h4>
              <LineChart
                data={filteredProgressData}
                categories={["carbs", "targetCarbs"]}
                index="date"
                colors={["#3b82f6", "#94a3b8"]}
                valueFormatter={value => `${value}g`}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Fat</h4>
              <LineChart
                data={filteredProgressData}
                categories={["fat", "targetFat"]}
                index="date"
                colors={["#8b5cf6", "#94a3b8"]}
                valueFormatter={value => `${value}g`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
