import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRecipeSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, AlertCircle, Info, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { generateRecipeDetails } from "@/ai-services/recipe-ai";

export function CreateRecipeDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertRecipeSchema),
    defaultValues: {
      title: "",
      description: "",
      ingredients: [],
      instructions: [],
      nutritionInfo: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      prepTime: 0,
      createdBy: user?.id,
      imageUrl: "",
      sustainabilityScore: 50,
      wastageReduction: {},
    },
    mode: "onChange",
    shouldUnregister: false, // Prevent fields from being unregistered
  });

  // Watch nutrition info fields individually for real-time updates
  const calories = form.watch("nutritionInfo.calories");
  const protein = form.watch("nutritionInfo.protein");
  const carbs = form.watch("nutritionInfo.carbs");
  const fat = form.watch("nutritionInfo.fat");
  const ingredients = form.watch("ingredients");

  // Calculate sustainability score whenever nutrition values change
  const currentSustainabilityScore = useMemo(() => {
    let score = 50;
    let modifiers = 0;

    console.log("Calculating sustainability score with:", {
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });

    const totalMacros =
      (Number(protein) || 0) + (Number(carbs) || 0) + (Number(fat) || 0);

    if (totalMacros > 0) {
      const proteinRatio = (Number(protein) || 0) / totalMacros;
      const carbsRatio = (Number(carbs) || 0) / totalMacros;
      const fatRatio = (Number(fat) || 0) / totalMacros;

      console.log("Macro ratios:", { proteinRatio, carbsRatio, fatRatio });

      // Award points for balanced macros
      if (proteinRatio >= 0.25 && proteinRatio <= 0.35) {
        modifiers += 15;
        console.log("Added 15 points for ideal protein ratio");
      } else if (proteinRatio >= 0.20 && proteinRatio <= 0.40) {
        modifiers += 10;
        console.log("Added 10 points for good protein ratio");
      }

      if (carbsRatio >= 0.45 && carbsRatio <= 0.55) {
        modifiers += 15;
        console.log("Added 15 points for ideal carbs ratio");
      } else if (carbsRatio >= 0.40 && carbsRatio <= 0.60) {
        modifiers += 10;
        console.log("Added 10 points for good carbs ratio");
      }

      if (fatRatio >= 0.15 && fatRatio <= 0.25) {
        modifiers += 15;
        console.log("Added 15 points for ideal fat ratio");
      } else if (fatRatio >= 0.10 && fatRatio <= 0.30) {
        modifiers += 10;
        console.log("Added 10 points for good fat ratio");
      }
    }

    // Award points for reasonable calorie content
    const calorieValue = Number(calories) || 0;
    if (calorieValue > 0) {
      if (calorieValue <= 400) {
        modifiers += 15;
        console.log("Added 15 points for ideal calorie content");
      } else if (calorieValue <= 600) {
        modifiers += 10;
        console.log("Added 10 points for good calorie content");
      } else if (calorieValue <= 800) {
        modifiers += 5;
        console.log("Added 5 points for acceptable calorie content");
      }
    }

    const finalScore = Math.min(100, Math.max(0, score + modifiers));
    console.log("Final sustainability score:", {
      baseScore: score,
      modifiers,
      finalScore,
    });

    // Update the form value immediately
    form.setValue("sustainabilityScore", finalScore, {
      shouldValidate: true,
      shouldDirty: true,
    });

    return finalScore;
  }, [calories, protein, carbs, fat, ingredients, form]);

  // Keep track of the latest calculated score in a ref for use during form submission
  const latestScoreRef = useRef(currentSustainabilityScore);
  useEffect(() => {
    latestScoreRef.current = currentSustainabilityScore;
  }, [currentSustainabilityScore]);

  const createRecipeMutation = useMutation({
    mutationFn: async (data) => {
      // Always use the latest calculated score
      const payload = {
        ...data,
        sustainabilityScore: latestScoreRef.current,
      };

      const res = await apiRequest("POST", "/api/recipes", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Recipe created!",
        description: "Your recipe has been added successfully.",
      });
    },
  });

  const onSubmit = (data) => {
    createRecipeMutation.mutate({
      ...data,
      sustainabilityScore: latestScoreRef.current,
    });
  };

  const { data: currentGoal } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current");
      return res.json();
    },
  });

  const validateAgainstGoals = (nutritionInfo) => {
    if (!currentGoal) return { valid: true };

    const exceeds = {
      calories: nutritionInfo.calories > currentGoal.dailyCalories,
      protein: nutritionInfo.protein > currentGoal.dailyProtein,
      carbs: nutritionInfo.carbs > currentGoal.dailyCarbs,
      fat: nutritionInfo.fat > currentGoal.dailyFat,
    };

    return {
      valid: !Object.values(exceeds).some((v) => v),
      exceeds,
      percentages: {
        calories: Math.round(
          (nutritionInfo.calories / currentGoal.dailyCalories) * 100
        ),
        protein: Math.round(
          (nutritionInfo.protein / currentGoal.dailyProtein) * 100
        ),
        carbs: Math.round(
          (nutritionInfo.carbs / currentGoal.dailyCarbs) * 100
        ),
        fat: Math.round((nutritionInfo.fat / currentGoal.dailyFat) * 100),
      },
    };
  };

  const generateAIDetails = async () => {
    if (!form.getValues("title")) {
      toast({
        title: "Recipe Title Required",
        description: "Please enter a recipe title first to generate details.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const details = await generateRecipeDetails(form.getValues("title"));

      // Update form with generated details
      form.setValue("description", details.description);
      form.setValue(
        "ingredients",
        details.ingredients.map(
          (ing) =>
            `${ing.amount} ${ing.item}${ing.notes ? ` (${ing.notes})` : ""}`
        )
      );
      form.setValue("instructions", details.instructions);
      form.setValue("nutritionInfo.calories", details.nutritionInfo.calories);
      form.setValue("nutritionInfo.protein", details.nutritionInfo.protein);
      form.setValue("nutritionInfo.carbs", details.nutritionInfo.carbs);
      form.setValue("nutritionInfo.fat", details.nutritionInfo.fat);
      form.setValue("prepTime", details.prepTime);

      toast.success("Recipe Details Generated", {
        description: "AI has generated recipe details. Feel free to edit them."
      });
    } catch (error) {
      toast.error("Generation Failed", {
        description:
          "Failed to generate recipe details. Please try again or enter manually."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 mb-4">
          <DialogTitle>Add New Recipe</DialogTitle>
        </DialogHeader>
        <div className="flex-1 dialog-scroll-area px-1 pb-6">
          <Alert className="mb-6 border-green-500">
            <Info className="size-4 text-yellow-500" />
            <AlertDescription className="ml-2">
              <span>
                Enter the title of the recipe and click the{" "}
                <span className="inline-flex mx-2 font-bold">
                  <Sparkles className="size-4 text-green-500 mr-2" /> Generate
                </span>{" "}
                button to auto-fill recipe details using AI. You'll need to add
                an image URL manually as AI generated image urls are not always
                accurate.
              </span>
            </AlertDescription>
          </Alert>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
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
                          Array.isArray(field.value)
                            ? field.value.join("\n")
                            : ""
                        }
                        onChange={(e) => {
                          const lines = e.target.value.split("\n");
                          field.onChange(lines);
                        }}
                        placeholder="Enter each ingredient on a new line"
                        className="min-h-[150px]"
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
                          Array.isArray(field.value)
                            ? field.value.join("\n")
                            : ""
                        }
                        onChange={(e) => {
                          const lines = e.target.value.split("\n");
                          field.onChange(lines);
                        }}
                        placeholder="Enter each instruction step on a new line"
                        className="min-h-[150px]"
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
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
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
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            field.onChange(value);
                            form.setValue("nutritionInfo.calories", value, {
                              shouldValidate: true,
                            });
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
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            field.onChange(value);
                            form.setValue("nutritionInfo.protein", value, {
                              shouldValidate: true,
                            });
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
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            field.onChange(value);
                            form.setValue("nutritionInfo.carbs", value, {
                              shouldValidate: true,
                            });
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
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            field.onChange(value);
                            form.setValue("nutritionInfo.fat", value, {
                              shouldValidate: true,
                            });
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-8 space-y-2">
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
                        <li>
                          Use of sustainable ingredients (organic, local,
                          seasonal)
                        </li>
                        <li>Balanced macronutrient ratios</li>
                        <li>Appropriate portion sizes</li>
                        <li>Overall nutritional balance</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
                {!currentGoal && (
                  <Alert variant="default" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          Nutrition Goals Not Set
                        </span>
                        <p className="text-sm text-muted-foreground">
                          Setting nutrition goals helps you track your daily
                          intake and maintain a balanced diet. You can set your
                          goals in the Nutrition Goals section.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                {currentGoal && (
                  <div className="mt-2">
                    {(() => {
                      const validation = validateAgainstGoals(
                        form.getValues("nutritionInfo")
                      );
                      if (!validation.valid) {
                        return (
                          <Alert variant="default">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <span className="font-medium">
                                High nutritional values:
                              </span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {validation.percentages &&
                                  Object.entries(validation.percentages).map(
                                    ([key, value]) =>
                                      validation.exceeds &&
                                      validation.exceeds[key] && (
                                        <Badge
                                          key={key}
                                          variant="outline"
                                          className="text-yellow-500"
                                        >
                                          {key.charAt(0).toUpperCase() +
                                            key.slice(1)}{" "}
                                          {value}% of daily goal
                                        </Badge>
                                      )
                                  )}
                              </div>
                              <p className="text-sm mt-2">
                                Consider adjusting portion sizes or ingredients to
                                better align with your daily goals.
                              </p>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {validation.percentages &&
                            Object.entries(validation.percentages).map(
                              ([key, value]) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-green-500"
                                >
                                  {key.charAt(0).toUpperCase() +
                                    key.slice(1)}{" "}
                                  {value}% of daily goal
                                </Badge>
                              )
                            )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createRecipeMutation.isPending}
              >
                {createRecipeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Recipe
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

