import { useAuth } from "@/hooks/use-auth"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  Sparkles,
  ShoppingBasket,
  Flame,
  Beef,
  Wheat,
  Droplet,
  ChefHat,
  ListChecks,
  Scale,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Bookmark,
  ChefHat as ChefHatIcon,
  Clock
} from "lucide-react"
import { useEffect, useState } from "react"
import { apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function PersonalizedRecommendations() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [feedbackData, setFeedbackData] = useState({
    rating: 0,
    feedback: "",
    wasCooked: false,
    wasSaved: false,
    wasShared: false,
    cookingNotes: "",
    modifications: {},
    difficultyRating: 0,
    timeAccuracy: 0,
    tasteRating: 0,
    healthinessRating: 0
  })

  const { data: recommendedRecipes, isLoading: isLoadingRecipes, refetch: refetchRecommendations } = useQuery({
    queryKey: ["/api/recipes/personalized", user?.id],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/recipes/personalized")
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      } catch (error) {
        console.error("Error fetching personalized recommendations:", error)
        return [] // Return empty array on error
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount
    refetchOnReconnect: false, // Don't refetch on reconnect
    onSuccess: data => {
      console.log("Received personalized recommendations:", data)
      setIsRefreshing(false)
    },
    onError: error => {
      console.error("Error fetching personalized recommendations:", error)
      setIsRefreshing(false)
      toast({
        title: "Error",
        description: "Failed to fetch personalized recommendations. Please try again.",
        variant: "destructive"
      })
    }
  })

  // Listen for recipe changes and refresh recommendations
  useEffect(() => {
    if (!user) return;

    // Setup an event listener for the recipes query changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only refresh if the recipes query is updated (not just invalidated)
      if (event?.type === 'updated' && event?.query?.queryKey?.[0] === "/api/recipes") {
        console.log("Recipe change detected, refreshing recommendations");
        setIsRefreshing(true);
        toast({
          title: "Updating Recommendations",
          description: "Your personalized recommendations are being updated..."
        });
        // Mark the personalized recommendations as stale
        queryClient.invalidateQueries({ queryKey: ["/api/recipes/personalized"] });
        // Trigger a refetch
        refetchRecommendations();
      }
    });

    // Return cleanup function
    return () => {
      unsubscribe();
    };
  }, [queryClient, user, refetchRecommendations, toast]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    toast({
      title: "Refreshing Recommendations",
      description: "Fetching fresh personalized recommendations...",
    });

    try {
      // First invalidate the current cache to force fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/personalized"] });

      // Try to call the refresh endpoint, but don't fail if it doesn't exist
      try {
        const res = await apiRequest("POST", "/api/recipes/recommendations/refresh");
        if (res.ok) {
          console.log("Refresh endpoint called successfully");
        }
      } catch (refreshError) {
        console.log("Refresh endpoint not available, proceeding with direct refetch");
      }

      // Always refetch recommendations regardless of refresh endpoint status
      await refetchRecommendations();

      toast({
        title: "Success",
        description: "Your recommendations have been refreshed!",
      });
    } catch (error) {
      console.error("Error refreshing recommendations:", error);

      // Try a fallback approach - just refetch without the refresh endpoint
      try {
        await refetchRecommendations();
        toast({
          title: "Success",
          description: "Your recommendations have been refreshed!",
        });
      } catch (fallbackError) {
        console.error("Fallback refresh also failed:", fallbackError);
        toast({
          title: "Error",
          description: "Failed to refresh recommendations. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedRecipe) return;
    
    try {
      const res = await apiRequest(
        "POST", 
        `/api/recipes/recommendations/${selectedRecipe.recommendationId}/feedback`,
        feedbackData
      );
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      toast({
        title: "Thank You!",
        description: "Your feedback has been recorded and will help improve your future recommendations.",
      });
      
      // Reset feedback data and close dialog
      setFeedbackData({
        rating: 0,
        feedback: "",
        wasCooked: false,
        wasSaved: false,
        wasShared: false,
        cookingNotes: "",
        modifications: {},
        difficultyRating: 0,
        timeAccuracy: 0,
        tasteRating: 0,
        healthinessRating: 0
      });
      setFeedbackDialogOpen(false);
      setSelectedRecipe(null);
      
      // Invalidate recommendations to trigger a refresh
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/personalized"] });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openFeedbackDialog = (recipe) => {
    setSelectedRecipe(recipe);
    setFeedbackDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Personalized Recipe Recommendations
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingRecipes || isRefreshing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse"></div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-primary font-medium">
                  {isRefreshing ? "Updating personalized recommendations..." : "Generating personalized recommendations..."}
                </p>
                <p className="text-muted-foreground text-sm">This may take a few moments</p>
              </div>
              <div className="w-full max-w-xs h-1 bg-primary/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-[progress_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          ) : (!recommendedRecipes?.recommendations || recommendedRecipes?.recommendations?.length === 0) ? (
            <p className="text-muted-foreground text-center py-8">
              No personalized recommendations available yet. Create a recipe in Recipes tab to get started!
            </p>
          ) : (
            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4 
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-background/50
              [&::-webkit-scrollbar-thumb]:bg-primary/20
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb:hover]:bg-primary/30
              [&::-webkit-scrollbar-thumb]:transition-colors">
              {recommendedRecipes?.recommendations?.map((recommendation, index) => {
                // Extract recipe data from the recommendation
                const recipe = recommendation.recipeData || {};
                
                return (
                  <Card key={index} className="overflow-hidden border border-primary/10 hover:border-primary/20 transition-colors bg-gradient-to-br from-background to-primary/5 shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
                      <div className="flex flex-col">
                        <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                          <ChefHat className="h-5 w-5 text-primary" />
                          {recipe.title || "Untitled Recipe"}
                        </CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {recipe.description || recommendation.reasonForRecommendation}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3" />
                          {recipe.prepTime || 30} min
                        </Badge>
                        <div className="flex items-center gap-2">
                          {recommendation.seasonalRelevance && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                    Seasonal
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This recipe uses seasonal ingredients</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                            {recommendation.matchScore}% Match
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-2">
                        <h4 className="font-medium text-lg flex items-center gap-2 text-foreground">
                          <ShoppingBasket className="h-5 w-5 text-primary" />
                          Ingredients
                        </h4>
                        <ul className="list-disc pl-4 space-y-1.5">
                          {recipe.ingredients?.map((ing, i) => (
                            <li key={i} className="text-muted-foreground hover:text-foreground transition-colors">
                              {ing}
                            </li>
                          )) || (
                            <li className="text-muted-foreground italic">No ingredients listed</li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-lg flex items-center gap-2 text-foreground">
                          <ListChecks className="h-5 w-5 text-primary" />
                          Instructions
                        </h4>
                        <ol className="list-decimal pl-4 space-y-3">
                          {recipe.instructions?.map((step, i) => (
                            <li key={i} className="text-muted-foreground hover:text-foreground transition-colors">
                              {step}
                            </li>
                          )) || (
                            <li className="text-muted-foreground italic">No instructions listed</li>
                          )}
                        </ol>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-lg flex items-center gap-2 text-foreground">
                          <Scale className="h-5 w-5 text-primary" />
                          Nutrition Info
                        </h4>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/10">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Flame className="h-4 w-4 text-orange-500" />
                              Calories
                            </p>
                            <p className="font-medium text-lg text-primary">
                              {recipe.nutritionInfo?.calories || 0}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Beef className="h-4 w-4 text-red-500" />
                              Protein
                            </p>
                            <p className="font-medium text-lg text-primary">
                              {recipe.nutritionInfo?.protein || 0}g
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Wheat className="h-4 w-4 text-amber-500" />
                              Carbs
                            </p>
                            <p className="font-medium text-lg text-primary">
                              {recipe.nutritionInfo?.carbs || 0}g
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Droplet className="h-4 w-4 text-blue-500" />
                              Fat
                            </p>
                            <p className="font-medium text-lg text-primary">
                              {recipe.nutritionInfo?.fat || 0}g
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Recipe Feedback</DialogTitle>
          </DialogHeader>
          
          {selectedRecipe && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-2">
                <ChefHatIcon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">{selectedRecipe.recipeData?.title || "Untitled Recipe"}</h3>
              </div>
              
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="cooking">Cooking Experience</TabsTrigger>
                  <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Overall Rating</Label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button
                          key={star}
                          variant={feedbackData.rating >= star ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setFeedbackData({...feedbackData, rating: star})}
                        >
                          {star}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Actions</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={feedbackData.wasCooked ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFeedbackData({...feedbackData, wasCooked: !feedbackData.wasCooked})}
                        className="flex items-center gap-1"
                      >
                        <ChefHatIcon className="h-4 w-4" />
                        Cooked
                      </Button>
                      <Button
                        variant={feedbackData.wasSaved ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFeedbackData({...feedbackData, wasSaved: !feedbackData.wasSaved})}
                        className="flex items-center gap-1"
                      >
                        <Bookmark className="h-4 w-4" />
                        Saved
                      </Button>
                      <Button
                        variant={feedbackData.wasShared ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFeedbackData({...feedbackData, wasShared: !feedbackData.wasShared})}
                        className="flex items-center gap-1"
                      >
                        <Share2 className="h-4 w-4" />
                        Shared
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Comments</Label>
                    <Textarea
                      placeholder="Share your thoughts about this recipe..."
                      value={feedbackData.feedback}
                      onChange={(e) => setFeedbackData({...feedbackData, feedback: e.target.value})}
                      className="min-h-[100px]"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="cooking" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Difficulty Level</Label>
                    <Slider
                      value={[feedbackData.difficultyRating]}
                      onValueChange={(value) => setFeedbackData({...feedbackData, difficultyRating: value[0]})}
                      max={5}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Too Easy</span>
                      <span>Just Right</span>
                      <span>Too Hard</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Prep Time Accuracy</Label>
                    <Slider
                      value={[feedbackData.timeAccuracy]}
                      onValueChange={(value) => setFeedbackData({...feedbackData, timeAccuracy: value[0]})}
                      max={5}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Much Faster</span>
                      <span>Accurate</span>
                      <span>Much Longer</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Cooking Notes</Label>
                    <Textarea
                      placeholder="Any modifications or tips for cooking this recipe..."
                      value={feedbackData.cookingNotes}
                      onChange={(e) => setFeedbackData({...feedbackData, cookingNotes: e.target.value})}
                      className="min-h-[100px]"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="nutrition" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Taste Rating</Label>
                    <Slider
                      value={[feedbackData.tasteRating]}
                      onValueChange={(value) => setFeedbackData({...feedbackData, tasteRating: value[0]})}
                      max={5}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Not Great</span>
                      <span>Good</span>
                      <span>Excellent</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Healthiness Rating</Label>
                    <Slider
                      value={[feedbackData.healthinessRating]}
                      onValueChange={(value) => setFeedbackData({...feedbackData, healthinessRating: value[0]})}
                      max={5}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Not Healthy</span>
                      <span>Moderate</span>
                      <span>Very Healthy</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFeedbackSubmit}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 