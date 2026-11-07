import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertRecipeSchema } from "@shared/schema"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Loader2, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import config from "@/lib/config"

export function EditRecipeDialog({ recipe, trigger }) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(insertRecipeSchema),
    defaultValues: {
      title: recipe.title || "",
      description: recipe.description || "",
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      nutritionInfo: recipe.nutritionInfo || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      },
      prepTime: recipe.prepTime || 30, // Default to 30 minutes if not set
      imageUrl: recipe.imageUrl || "",
      createdBy: recipe.createdBy || undefined,
      forkedFrom: recipe.forkedFrom || undefined, // Convert null to undefined for optional field
      sustainabilityScore: recipe.sustainabilityScore || 0,
      wastageReduction: recipe.wastageReduction || {}
    }
  })

  // Watch nutrition info fields individually to ensure real-time updates
  const calories = form.watch("nutritionInfo.calories")
  const protein = form.watch("nutritionInfo.protein")
  const carbs = form.watch("nutritionInfo.carbs")
  const fat = form.watch("nutritionInfo.fat")
  const ingredients = form.watch("ingredients")

  // Calculate sustainability score whenever nutrition values change
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
      if (calorieValue <= 400) {
        modifiers += 15
      } else if (calorieValue <= 600) {
        modifiers += 10
      } else if (calorieValue <= 800) {
        modifiers += 5
      }
    }

    // Calculate final score
    const finalScore = Math.min(100, Math.max(0, score + modifiers))

    // Update the form value immediately
    form.setValue("sustainabilityScore", finalScore, {
      shouldValidate: true,
      shouldDirty: true
    })

    return finalScore
  }, [calories, protein, carbs, fat, ingredients, form])

  // Track the latest calculated score in a ref to ensure it's available during form submission
  const latestScoreRef = React.useRef(currentSustainabilityScore)
  React.useEffect(() => {
    latestScoreRef.current = currentSustainabilityScore
  }, [currentSustainabilityScore])

  const editRecipeMutation = useMutation({
    mutationFn: async data => {
      // Clean up null values and always use the latest calculated score
      const payload = {
        ...data,
        sustainabilityScore: latestScoreRef.current,
        // Ensure optional number fields are undefined instead of null
        createdBy: data.createdBy || undefined,
        forkedFrom: data.forkedFrom || undefined
      }

      // Use XMLHttpRequest to completely bypass fetch overrides and middleware issues
      const token = localStorage.getItem('authToken')
      console.log('Using XMLHttpRequest with token:', token)

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PATCH', `${config.apiBaseUrl}/api/recipes/${recipe.id}`)

        // Set headers
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.setRequestHeader('Accept', 'application/json')
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }

        // Enable credentials for session auth
        xhr.withCredentials = true

        xhr.onload = function() {
          console.log('XMLHttpRequest response:', xhr.status, xhr.statusText)

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText)
              console.log('Update successful:', result)
              resolve(result)
            } catch (e) {
              console.log('Update successful (no JSON response)')
              resolve({})
            }
          } else {
            console.error('XMLHttpRequest failed:', xhr.status, xhr.responseText)
            reject(new Error(`Failed to update recipe: ${xhr.status} ${xhr.statusText}`))
          }
        }

        xhr.onerror = function() {
          console.error('XMLHttpRequest network error')
          reject(new Error('Network error occurred'))
        }

        xhr.send(JSON.stringify(payload))
      })
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure synchronization between pages
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] })
      queryClient.invalidateQueries({ queryKey: ["/api/community"] })
      queryClient.invalidateQueries({ queryKey: ["recommendedRecipes"] })

      // If recipe is part of a community post, make sure to update that specific post too
      if (recipe.postId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/community", recipe.postId]
        })
      }

      setOpen(false)
      toast({
        title: "Recipe updated!",
        description: "Your recipe has been updated successfully."
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recipe. Please try again.",
        variant: "destructive"
      })
    }
  })



  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: () => setOpen(true)
        })
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Recipe
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Recipe</DialogTitle>
            <DialogDescription>
              Update your recipe details and sustainability information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 dialog-scroll-area pr-2 min-h-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(
                  data => {
                    editRecipeMutation.mutate(data)
                  },
                  errors => {
                    console.error("Form validation failed:", errors)
                    toast({
                      title: "Validation Error",
                      description: "Please check the form for errors and try again.",
                      variant: "destructive"
                    })
                  }
                )}
                className="space-y-4"
              >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingredients (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={
                        Array.isArray(field.value) ? field.value.join("\n") : ""
                      }
                      onChange={e =>
                        field.onChange(
                          e.target.value.split("\n").filter(Boolean)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={
                        Array.isArray(field.value) ? field.value.join("\n") : ""
                      }
                      onChange={e =>
                        field.onChange(
                          e.target.value.split("\n").filter(Boolean)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prepTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preparation Time (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nutritionInfo.calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0
                          field.onChange(value)
                          form.setValue("nutritionInfo.calories", value, {
                            shouldValidate: true
                          })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nutritionInfo.protein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protein (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0
                          field.onChange(value)
                          form.setValue("nutritionInfo.protein", value, {
                            shouldValidate: true
                          })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nutritionInfo.carbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carbs (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0
                          field.onChange(value)
                          form.setValue("nutritionInfo.carbs", value, {
                            shouldValidate: true
                          })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nutritionInfo.fat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fat (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0
                          field.onChange(value)
                          form.setValue("nutritionInfo.fat", value, {
                            shouldValidate: true
                          })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
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
                    <p>Score is calculated based on:</p>
                    <ul className="list-disc pl-4">
                      <li>Use of sustainable ingredients</li>
                      <li>Balanced macronutrient ratios</li>
                      <li>Appropriate portion sizes</li>
                      <li>Overall nutritional balance</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={editRecipeMutation.isPending}
            >
              {editRecipeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Recipe
            </Button>
          </form>
        </Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
