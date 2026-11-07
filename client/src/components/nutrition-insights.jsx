import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Loader2, ArrowRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export function NutritionInsights() {
  const insightsQuery = useQuery({
    queryKey: ["nutrition-insights"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/insights")
      return res.json()
    }
  })

  if (insightsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!insightsQuery.data) return null

  const {
    suggestedGoals,
    reasoning,
    mealSuggestions,
    improvements
  } = insightsQuery.data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Nutrition Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium">Suggested Goals</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {suggestedGoals.calories}
                </div>
                <p className="text-xs text-muted-foreground">Daily Calories</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {suggestedGoals.protein}g
                </div>
                <p className="text-xs text-muted-foreground">Protein</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {suggestedGoals.carbs}g
                </div>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{suggestedGoals.fat}g</div>
                <p className="text-xs text-muted-foreground">Fat</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">{reasoning}</p>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Meal Suggestions</h4>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            {mealSuggestions.map((mealType, index) => (
              <div key={index} className="mb-4">
                <h5 className="text-sm font-medium mb-2 capitalize">
                  {mealType.type}
                </h5>
                <ul className="space-y-2">
                  {mealType.suggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <ArrowRight className="h-3 w-3 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Suggested Improvements</h4>
          <div className="flex flex-wrap gap-2">
            {improvements.map((improvement, index) => (
              <Badge key={index} variant="secondary">
                {improvement}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => insightsQuery.refetch()}
          disabled={insightsQuery.isFetching}
        >
          {insightsQuery.isFetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Insights"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
