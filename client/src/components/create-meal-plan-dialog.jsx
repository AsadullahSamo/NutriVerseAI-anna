import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, HelpCircle } from "lucide-react"
import { addDays, format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

export function CreateMealPlanDialog({ open, onOpenChange }) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState()
  const [preferences, setPreferences] = useState("")
  const [dietaryRestrictions, setDietaryRestrictions] = useState("")
  const [calorieTarget, setCalorieTarget] = useState("")
  const [days, setDays] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!startDate) throw new Error("Start date is required")
      console.log(startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset to midnight

      const selectedDate = new Date(startDate)
      selectedDate.setHours(0, 0, 0, 0) // Reset to midnight

      if (selectedDate.getTime() < today.getTime()) {
        throw new Error("Start date cannot be in the past")
      }
      setErrorMessage("")

      // Validate inputs
      if (!preferences.trim()) {
        throw new Error("Please enter at least one preference")
      }

      const daysValue = parseInt(days)
      if (isNaN(daysValue) || daysValue < 1) {
        throw new Error("Please enter a valid number of days")
      }

      // Enforce strict 7-day limit
      if (daysValue > 7) {
        throw new Error("Meal plans cannot exceed 7 days")
      }

      // Validate calorie target if provided
      if (calorieTarget) {
        const calorieValue = parseInt(calorieTarget)
        if (isNaN(calorieValue) || calorieValue < 500 || calorieValue > 5000) {
          throw new Error(
            "Please enter a reasonable calorie target (between 500-5000)"
          )
        }
      }

      const formattedPreferences = preferences
        .split(",")
        .map(p => p.trim())
        .filter(Boolean)
      const formattedDietaryRestrictions = dietaryRestrictions
        ? dietaryRestrictions
            .split(",")
            .map(r => r.trim())
            .filter(Boolean)
        : undefined

      const endDate = addDays(startDate, parseInt(days) - 1)

      try {
        // Format dates as ISO strings for consistent API handling
        const startDateISO = startDate.toISOString()
        const endDateISO = endDate.toISOString()

        console.log("Sending meal plan request with dates:", {
          startDate: startDateISO,
          endDate: endDateISO
        })

        const response = await apiRequest("POST", "/api/meal-plans", {
          title,
          startDate: startDateISO,
          endDate: endDateISO,
          preferences: formattedPreferences,
          dietaryRestrictions: formattedDietaryRestrictions,
          calorieTarget: calorieTarget ? parseInt(calorieTarget) : undefined,
          days: daysValue
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || "Failed to create meal plan")
        }

        return response.json()
      } catch (error) {
        console.error("Error creating meal plan:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] })
      toast({
        title: "Success",
        description: "Your meal plan has been created."
      })
      onOpenChange(false)
      resetForm()
    },
    onError: error => {
      console.error("Meal plan generation error:", error)
      setErrorMessage(
        error.message || "Failed to create meal plan. Please try again."
      )
      toast({
        title: "Error",
        description:
          error.message || "Failed to create meal plan. Please try again.",
        variant: "destructive"
      })
    }
  })

  const resetForm = () => {
    setTitle("")
    setStartDate(undefined)
    setPreferences("")
    setDietaryRestrictions("")
    setCalorieTarget("")
    setDays("7")
    setErrorMessage("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Meal Plan</DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={e => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="My Meal Plan"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <div className="flex justify-center p-2 border rounded-lg bg-card">
              <div className="w-full max-w-sm">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  className="mx-auto rounded-md shadow-sm"
                  required
                />
              </div>
            </div>
            {startDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {format(startDate, "MMMM d, yyyy")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="days">Number of Days</Label>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Number of days info</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    align="center"
                    className="max-w-[200px]"
                  >
                    <p>For optimal results, we recommend 7-day plans</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="days"
              type="number"
              min="1"
              max="7"
              placeholder="7"
              value={days}
              onChange={e => setDays(e.target.value)}
              required
            />
            {parseInt(days) > 7 && (
              <p className="text-xs text-red-500 mt-1">
                Meal plans cannot exceed 7 days
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Preferences</Label>
            <Input
              id="preferences"
              placeholder="healthy, quick meals, vegetarian"
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple preferences with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
            <Input
              id="dietaryRestrictions"
              placeholder="gluten-free, dairy-free"
              value={dietaryRestrictions}
              onChange={e => setDietaryRestrictions(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple restrictions with commas
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="calorieTarget">Daily Calorie Target</Label>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Calorie target info</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    align="center"
                    className="max-w-[200px]"
                  >
                    <p>Enter a value between 500-5000 calories</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="calorieTarget"
              type="number"
              placeholder="2000"
              min="500"
              max="5000"
              value={calorieTarget}
              onChange={e => setCalorieTarget(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                "Create Plan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
