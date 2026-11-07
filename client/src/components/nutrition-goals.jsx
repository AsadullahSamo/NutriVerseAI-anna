
import React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Loader2, X, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ChartJSLineChart as LineChart } from "@/components/ui/chartjs-chart"
import config from "@/lib/config"

export function NutritionGoals() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [showWelcomeMessage, setShowWelcomeMessage] = React.useState(true)
  const [formData, setFormData] = React.useState({
    dailyCalories: "",
    dailyProtein: "",
    dailyCarbs: "",
    dailyFat: ""
  })

  const { data: currentGoal, isLoading } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate inputs before sending
      const calories = parseInt(formData.dailyCalories)
      const protein = parseInt(formData.dailyProtein)
      const carbs = parseInt(formData.dailyCarbs)
      const fat = parseInt(formData.dailyFat)

      if (isNaN(calories) || calories < 500 || calories > 5000) {
        throw new Error("Daily calories must be between 500 and 5000")
      }
      if (isNaN(protein) || protein < 10 || protein > 500) {
        throw new Error("Daily protein must be between 10g and 500g")
      }
      if (isNaN(carbs) || carbs < 0 || carbs > 500) {
        throw new Error("Daily carbs must be between 0g and 500g")
      }
      if (isNaN(fat) || fat < 0 || fat > 200) {
        throw new Error("Daily fat must be between 0g and 200g")
      }

      const data = {
        dailyCalories: calories,
        dailyProtein: protein,
        dailyCarbs: carbs,
        dailyFat: fat,
        progress: []
      }

      const token = localStorage.getItem('authToken')
      const res = await fetch(`${config.apiBaseUrl}/api/nutrition-goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(data),
        credentials: "include"
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.message || "Failed to set nutrition goals")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/nutrition-goals/current"]
      })
      setShowCreateDialog(false)
      resetForm()
      toast({
        title: "Success",
        description: "Nutrition goals have been set!"
      })
    },
    onError: (error) => {
      console.error("Nutrition goals error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to set nutrition goals. Please try again.",
        variant: "destructive"
      })
    }
  })

  const resetForm = () => {
    setFormData({
      dailyCalories: "",
      dailyProtein: "",
      dailyCarbs: "",
      dailyFat: ""
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const today = new Date().toISOString().split("T")[0]
  const progress = Array.isArray(currentGoal?.progress)
    ? currentGoal.progress
    : []
  const todayProgress = progress.find(p => p.date === today)

  const getProgressPercent = (current, target) =>
    Math.min(Math.round((current / target) * 100), 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Nutrition Goals</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          {currentGoal ? (
            <>
              <Edit2 className="w-4 h-4 mr-2" />
              Update Goals
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Set Goals
            </>
          )}
        </Button>
      </div>

      {currentGoal ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Calories</span>
                  <span className="text-muted-foreground">
                    {todayProgress?.calories || 0} / {currentGoal.dailyCalories}
                  </span>
                </div>
                <Progress
                  value={getProgressPercent(
                    todayProgress?.calories || 0,
                    currentGoal.dailyCalories
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Protein</span>
                    <span className="text-muted-foreground">
                      {todayProgress?.protein || 0}g /{" "}
                      {currentGoal.dailyProtein}g
                    </span>
                  </div>
                  <Progress
                    value={getProgressPercent(
                      todayProgress?.protein || 0,
                      currentGoal.dailyProtein
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Carbs</span>
                    <span className="text-muted-foreground">
                      {todayProgress?.carbs || 0}g / {currentGoal.dailyCarbs}g
                    </span>
                  </div>
                  <Progress
                    value={getProgressPercent(
                      todayProgress?.carbs || 0,
                      currentGoal.dailyCarbs
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fat</span>
                    <span className="text-muted-foreground">
                      {todayProgress?.fat || 0}g / {currentGoal.dailyFat}g
                    </span>
                  </div>
                  <Progress
                    value={getProgressPercent(
                      todayProgress?.fat || 0,
                      currentGoal.dailyFat
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {showWelcomeMessage && progress.length <= 2 && (
                <div className="mb-4 relative">
                  <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Getting Started</h4>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowWelcomeMessage(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                      Your progress graph will grow as you track your nutrition over time. Each point represents your daily nutrition data, and the line will connect them to show your progress. Create a recipe and consume it (using Consume button) of that recipe to get started with your first day of nutrition tracking.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
              <LineChart
                data={progress.slice(-7)}
                categories={["calories", "protein", "carbs", "fat"]}
                index="date"
                colors={["#f97316", "#22c55e", "#3b82f6", "#8b5cf6"]}
                valueFormatter={value => `${value}${value > 100 ? "cal" : "g"}`}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-muted-foreground">
              You haven't set any nutrition goals yet.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Set Goals
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {currentGoal ? "Update Goals" : "Set Nutrition Goals"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="dailyCalories">Daily Calories Target</Label>
              <Input
                id="dailyCalories"
                type="number"
                placeholder="e.g., 2000"
                value={formData.dailyCalories}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    dailyCalories: e.target.value
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyProtein">Daily Protein Target (g)</Label>
              <Input
                id="dailyProtein"
                type="number"
                placeholder="e.g., 50"
                value={formData.dailyProtein}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    dailyProtein: e.target.value
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyCarbs">Daily Carbs Target (g)</Label>
              <Input
                id="dailyCarbs"
                type="number"
                placeholder="e.g., 250"
                value={formData.dailyCarbs}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    dailyCarbs: e.target.value
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyFat">Daily Fat Target (g)</Label>
              <Input
                id="dailyFat"
                type="number"
                placeholder="e.g., 70"
                value={formData.dailyFat}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    dailyFat: e.target.value
                  }))
                }
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {currentGoal ? "Update Goals" : "Set Goals"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
