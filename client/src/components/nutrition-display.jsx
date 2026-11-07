import { Progress } from "@/components/ui/progress"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { AlertCircle } from "lucide-react"

export function NutritionDisplay({ nutrition, showGoals = true }) {
  console.log("NutritionDisplay received:", nutrition)

  const { data: currentGoal } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    },
    enabled: showGoals
  })

  const getPercentage = (value, max) =>
    Math.min(Math.round((value / max) * 100), 100)

  const getProgressColor = percent => {
    if (percent > 100) return "text-red-500"
    if (percent > 90) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Nutrition Information</h4>
        {showGoals && currentGoal && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Values shown against your daily goals</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-2">
        {/* Calories row - full width */}
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-6">
            <span className="text-sm">Calories</span>
            <span className="text-sm text-muted-foreground min-w-[60px] text-right tabular-nums">
              {nutrition.calories} kcal
            </span>
            {showGoals && currentGoal && (
              <Badge
                variant="outline"
                className={`${getProgressColor(
                  getPercentage(nutrition.calories, currentGoal.dailyCalories)
                )} min-w-[48px] text-center tabular-nums`}
              >
                {getPercentage(nutrition.calories, currentGoal.dailyCalories)}%
              </Badge>
            )}
          </div>
          {showGoals && currentGoal && (
            <Progress
              value={getPercentage(
                nutrition.calories,
                currentGoal.dailyCalories
              )}
              className="h-2"
            />
          )}
        </div>

        {/* Macronutrients grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Protein column */}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <span className="text-sm">Protein</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {nutrition.protein}g
                </span>
              </div>
              {showGoals && currentGoal && (
                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={`${getProgressColor(
                      getPercentage(nutrition.protein, currentGoal.dailyProtein)
                    )} min-w-[48px] text-center tabular-nums`}
                  >
                    {getPercentage(nutrition.protein, currentGoal.dailyProtein)}
                    %
                  </Badge>
                </div>
              )}
            </div>
            {showGoals && currentGoal && (
              <Progress
                value={getPercentage(
                  nutrition.protein,
                  currentGoal.dailyProtein
                )}
                className="h-2"
              />
            )}
          </div>

          {/* Carbs column */}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <span className="text-sm">Carbs</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {nutrition.carbs}g
                </span>
              </div>
              {showGoals && currentGoal && (
                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={`${getProgressColor(
                      getPercentage(nutrition.carbs, currentGoal.dailyCarbs)
                    )} min-w-[48px] text-center tabular-nums`}
                  >
                    {getPercentage(nutrition.carbs, currentGoal.dailyCarbs)}%
                  </Badge>
                </div>
              )}
            </div>
            {showGoals && currentGoal && (
              <Progress
                value={getPercentage(nutrition.carbs, currentGoal.dailyCarbs)}
                className="h-2"
              />
            )}
          </div>

          {/* Fat column */}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <span className="text-sm">Fat</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {nutrition.fat}g
                </span>
              </div>
              {showGoals && currentGoal && (
                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={`${getProgressColor(
                      getPercentage(nutrition.fat, currentGoal.dailyFat)
                    )} min-w-[48px] text-center tabular-nums`}
                  >
                    {getPercentage(nutrition.fat, currentGoal.dailyFat)}%
                  </Badge>
                </div>
              )}
            </div>
            {showGoals && currentGoal && (
              <Progress
                value={getPercentage(nutrition.fat, currentGoal.dailyFat)}
                className="h-2"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
