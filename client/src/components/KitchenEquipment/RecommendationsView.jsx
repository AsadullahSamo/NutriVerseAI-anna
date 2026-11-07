import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, ArrowRight } from "lucide-react"

export function RecommendationsView({
  recommendations,
  onRecommendationAction
}) {
  const getPriorityColor = priority => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!recommendations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Equipment Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            No recommendations available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{recommendation.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {recommendation.category}
                      </Badge>
                      <Badge
                        className={getPriorityColor(recommendation.priority)}
                      >
                        {recommendation.priority} priority
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {recommendation.estimatedPrice}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {recommendation.reason}
                </p>

                {recommendation.alternativeOptions &&
                  recommendation.alternativeOptions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">
                        Alternative Options:
                      </h4>
                      <ul className="text-sm space-y-1">
                        {recommendation.alternativeOptions.map((option, i) => (
                          <li key={i} className="text-muted-foreground">
                            • {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => onRecommendationAction(recommendation)}
                  >
                    <Plus className="h-4 w-4" />
                    Add to Inventory
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() =>
                      window.open(
                        `https://www.amazon.com/s?k=${encodeURIComponent(
                          recommendation.name
                        )}`,
                        "_blank"
                      )
                    }
                  >
                    Shop Online
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
