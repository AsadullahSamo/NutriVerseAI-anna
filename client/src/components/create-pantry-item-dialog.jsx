import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertPantryItemSchema } from "@shared/schema"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { useAuth } from "@/hooks/use-auth"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  Info,
  Leaf,
  Recycle,
  AlertTriangle,
  Sparkles
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { generatePantryItemDetails } from "@/ai-services/recipe-ai"

export function CreatePantryItemDialog({ trigger }) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { user } = useAuth()

  const form = useForm({
    resolver: zodResolver(insertPantryItemSchema),
    defaultValues: {
      userId: user?.id,
      name: "",
      image_url: "",
      quantity: "",
      category: "",
      expiryDate: undefined,
      nutritionInfo: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      },
      sustainabilityInfo: {
        score: 0,
        packaging: "recyclable",
        carbonFootprint: "low"
      }
    }
  })

  // Watch nutrition info fields to calculate sustainability score
  const nutritionInfo = form.watch("nutritionInfo")
  const calories = nutritionInfo?.calories || 0
  const protein = nutritionInfo?.protein || 0
  const carbs = nutritionInfo?.carbs || 0
  const fat = nutritionInfo?.fat || 0

  // Watch sustainability info fields
  const sustainabilityInfo = form.watch("sustainabilityInfo")
  const packaging = sustainabilityInfo?.packaging || "recyclable"
  const carbonFootprint = sustainabilityInfo?.carbonFootprint || "low"

  // Calculate sustainability score based on nutrition values
  const currentSustainabilityScore = useMemo(() => {
    let score = 50
    let modifiers = 0

    // Calculate nutrition-based modifiers (primary factor)
    const totalMacros =
      (Number(protein) || 0) + (Number(carbs) || 0) + (Number(fat) || 0)

    if (totalMacros > 0) {
      const proteinRatio = (Number(protein) || 0) / totalMacros
      const carbsRatio = (Number(carbs) || 0) / totalMacros
      const fatRatio = (Number(fat) || 0) / totalMacros

      // Award points for balanced macros
      if (proteinRatio >= 0.25 && proteinRatio <= 0.35) {
        modifiers += 15
      } else if (proteinRatio >= 0.2 && proteinRatio <= 0.4) {
        modifiers += 10
      }

      if (carbsRatio >= 0.45 && carbsRatio <= 0.55) {
        modifiers += 15
      } else if (carbsRatio >= 0.4 && carbsRatio <= 0.6) {
        modifiers += 10
      }

      if (fatRatio >= 0.15 && fatRatio <= 0.25) {
        modifiers += 15
      } else if (fatRatio >= 0.1 && fatRatio <= 0.3) {
        modifiers += 10
      }
    }

    // Award points for reasonable calorie content
    const calorieValue = Number(calories) || 0
    if (calorieValue > 0) {
      if (calorieValue <= 200) {
        modifiers += 15
      } else if (calorieValue <= 300) {
        modifiers += 10
      } else if (calorieValue <= 400) {
        modifiers += 5
      }
    }

    // Consider packaging and carbon footprint in sustainability score
    if (packaging === "biodegradable") modifiers += 10
    else if (packaging === "recyclable") modifiers += 5

    if (carbonFootprint === "low") modifiers += 10
    else if (carbonFootprint === "medium") modifiers += 5
    else if (carbonFootprint === "high") modifiers -= 5

    // Calculate final score
    const finalScore = Math.min(100, Math.max(0, score + modifiers))

    // Update the sustainabilityInfo.score in the form
    const currentSustainabilityInfo = form.getValues("sustainabilityInfo") || {}
    form.setValue(
      "sustainabilityInfo",
      {
        ...currentSustainabilityInfo,
        score: finalScore
      },
      { shouldValidate: true }
    )

    return finalScore
  }, [calories, protein, carbs, fat, packaging, carbonFootprint, form])

  const createMutation = useMutation({
    mutationFn: async values => {
      // Ensure we use the latest calculated sustainability score
      const currentSustainabilityInfo =
        form.getValues("sustainabilityInfo") || {}
      values.sustainabilityInfo = {
        ...currentSustainabilityInfo,
        score: currentSustainabilityScore
      }

      // First create the pantry item
      const res = await apiRequest("POST", "/api/pantry", values)
      const newItem = await res.json()

      // Then update nutrition progress
      const today = new Date().toISOString().split("T")[0]
      await apiRequest("POST", "/api/nutrition-goals/progress", {
        progress: {
          date: today,
          calories: values.nutritionInfo.calories,
          protein: values.nutritionInfo.protein,
          carbs: values.nutritionInfo.carbs,
          fat: values.nutritionInfo.fat,
          completed: false
        }
      })

      return newItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] })
      setOpen(false)
      form.reset()
      toast.success("Item added!", {
        description: "Your pantry item has been added successfully."
      })
      queryClient.invalidateQueries({
        queryKey: ["/api/nutrition-goals/current"]
      })
    }
  })

  const getCarbonFootprintIcon = footprint => {
    switch (footprint.toLowerCase()) {
      case "low":
        return <Leaf className="h-4 w-4 text-green-500" />
      case "medium":
        return <Recycle className="h-4 w-4 text-yellow-500" />
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Leaf className="h-4 w-4 text-green-500" />
    }
  }

  const getCarbonFootprintColor = footprint => {
    switch (footprint.toLowerCase()) {
      case "low":
        return "bg-green-500/10 text-green-600 border-green-200"
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
      case "high":
        return "bg-red-500/10 text-red-600 border-red-200"
      default:
        return "bg-green-500/10 text-green-600 border-green-200"
    }
  }

  const generateAIDetails = async () => {
    if (!form.getValues("name")) {
      toast.error("Item Name Required", {
        description: "Please enter an item name first to generate details."
      })
      return
    }

    setIsGenerating(true)
    try {
      const itemName = form.getValues("name")
      const category = form.getValues("category")
      const details = await generatePantryItemDetails(itemName, category)

      // Update form with generated details
      form.setValue("name", details.name)
      form.setValue("category", details.category)
      form.setValue("quantity", details.quantity)
      form.setValue("image_url", details.image_url)

      // Set expiry date based on the expiryDays value
      if (details.expiryDays) {
        const today = new Date()
        const expiryDate = new Date()
        expiryDate.setDate(today.getDate() + details.expiryDays)
        form.setValue("expiryDate", expiryDate)
      }

      // Update nutrition info
      form.setValue("nutritionInfo", {
        calories: details.nutritionInfo.calories,
        protein: details.nutritionInfo.protein,
        carbs: details.nutritionInfo.carbs,
        fat: details.nutritionInfo.fat
      })

      // Update sustainability info - explicitly include packaging and carbonFootprint
      const packaging = details.sustainabilityInfo.packaging || "recyclable"
      const carbonFootprint =
        details.sustainabilityInfo.carbonFootprint || "low"

      form.setValue("sustainabilityInfo", {
        score: currentSustainabilityScore,
        packaging: packaging,
        carbonFootprint: carbonFootprint
      })

      // Trigger a form validation to update all derived values
      form.trigger("sustainabilityInfo")

      // Log the sustainability info for debugging
      console.log("Generated sustainability info:", {
        packaging,
        carbonFootprint,
        score: currentSustainabilityScore
      })

      toast.success("Item Details Generated", {
        description:
          "AI has generated item details including packaging type and carbon footprint."
      })
    } catch (error) {
      console.error("Error generating pantry item details:", error)
      toast.error("Generation Failed", {
        description:
          "Failed to generate item details. Please try again or enter manually."
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-background pb-4 mb-4">
          <DialogTitle>Add Pantry Item</DialogTitle>
        </DialogHeader>
        <div className="px-1 pb-6">
          <Alert className="mb-6 border-green-500">
            <Info className="size-4 text-yellow-500" />
            <AlertDescription className="ml-2">
              <span>
                Enter the name of the item and click the{" "}
                <span className="inline-flex mx-2 font-bold">
                  <Sparkles className="size-4 text-green-500 mr-2" /> Generate
                </span>{" "}
                button to auto-fill item details using AI, including nutrition
                data, packaging type, and carbon footprint.
              </span>
            </AlertDescription>
          </Alert>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(data => createMutation.mutate(data))}
              className="space-y-8"
            >
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateAIDetails}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                                <span className="ml-2">Generating...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 text-green-500" />
                                <span className="ml-2">Generate</span>
                              </>
                            )}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            value={
                              field.value
                                ? new Date(field.value)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={e =>
                              field.onChange(
                                e.target.value ? new Date(e.target.value) : null
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Nutrition Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Nutrition Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nutritionInfo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Calories</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={value?.calories ?? "0"}
                            onChange={e => {
                              const newValue = e.target.value
                                ? parseInt(e.target.value)
                                : 0
                              onChange({ ...value, calories: newValue })
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nutritionInfo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Protein (g)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={value?.protein ?? "0"}
                            onChange={e => {
                              const newValue = e.target.value
                                ? parseInt(e.target.value)
                                : 0
                              onChange({ ...value, protein: newValue })
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nutritionInfo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Carbs (g)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={value?.carbs ?? "0"}
                            onChange={e => {
                              const newValue = e.target.value
                                ? parseInt(e.target.value)
                                : 0
                              onChange({ ...value, carbs: newValue })
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nutritionInfo"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Fat (g)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={value?.fat ?? "0"}
                            onChange={e => {
                              const newValue = e.target.value
                                ? parseInt(e.target.value)
                                : 0
                              onChange({ ...value, fat: newValue })
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sustainability Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sustainability Information
                </h3>
                <div className="space-y-4">
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <div className="flex justify-between items-center">
                        <span>Sustainability Score</span>
                        <div
                          className={`px-2 py-0.5 rounded ${
                            currentSustainabilityScore >= 70
                              ? "bg-green-500/10 text-green-600"
                              : currentSustainabilityScore >= 40
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          <span className="font-medium">
                            {currentSustainabilityScore}/100
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Score is automatically calculated based on:</p>
                        <ul className="list-disc pl-4">
                          <li>Balanced macro nutrients</li>
                          <li>Appropriate calorie content</li>
                          <li>Packaging type and carbon footprint</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sustainabilityInfo.packaging"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Packaging Type</FormLabel>
                          <FormControl>
                            <select
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="navbar-dropdown-trigger"
                            >
                              <option value="">Select packaging type</option>
                              <option value="recyclable">Recyclable</option>
                              <option value="biodegradable">Biodegradable</option>
                              <option value="reusable">Reusable</option>
                              <option value="non-recyclable">Non-Recyclable</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sustainabilityInfo.carbonFootprint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carbon Footprint</FormLabel>
                          <FormControl>
                            <select
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="navbar-dropdown-trigger"
                            >
                              <option value="">Select carbon footprint</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Carbon Footprint Visual Indicator */}
                  <div className="mt-4 p-4 bg-card rounded-lg border">
                    <h4 className="text-sm font-medium mb-3">
                      Environmental Impact
                    </h4>
                    <div className="flex items-center space-x-3 mb-2">
                      {getCarbonFootprintIcon(carbonFootprint)}
                      <Badge
                        className={`${getCarbonFootprintColor(
                          carbonFootprint
                        )}`}
                      >
                        {carbonFootprint.charAt(0).toUpperCase() +
                          carbonFootprint.slice(1)}{" "}
                        Carbon Footprint
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {carbonFootprint === "low" &&
                        "This product has minimal environmental impact and aligns with sustainable consumption."}
                      {carbonFootprint === "medium" &&
                        "This product has moderate environmental impact. Consider local and seasonal alternatives when possible."}
                      {carbonFootprint === "high" &&
                        "This product has significant environmental impact. Consider using it sparingly or finding sustainable alternatives."}
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          carbonFootprint === "low"
                            ? "bg-green-500 w-1/3"
                            : carbonFootprint === "medium"
                            ? "bg-yellow-500 w-2/3"
                            : "bg-red-500 w-full"
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Item
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

