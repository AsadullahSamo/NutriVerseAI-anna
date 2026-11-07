import { useQuery } from "@tanstack/react-query"
import { RecipeCard } from "@/components/recipe-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Utensils, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { CreateRecipeDialog } from "@/components/create-recipe-dialog"
import { useAuth } from "@/hooks/use-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RecipeRecommendations } from "@/components/recipe-recommendations"
import { apiRequest } from "@/lib/queryClient"

export default function RecipesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const { user } = useAuth()
  const { data: recipes, isLoading } = useQuery({
    queryKey: ["/api/recipes"]
  })

  const { data: currentGoal } = useQuery({
    queryKey: ["/api/nutrition-goals/current"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition-goals/current")
      return res.json()
    }
  })

  const filteredRecipes = recipes?.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
              <p className="text-muted-foreground mt-2">
                Discover healthy and delicious meals
              </p>
            </div>
            <CreateRecipeDialog />
          </div>
        </header>

        {!currentGoal && (
          <div className="mb-6 p-4 rounded-lg border bg-muted/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium">Set Your Nutrition Goals</h4>
                <p className="text-sm text-muted-foreground">
                  To track your nutrition progress and get personalized recipe
                  recommendations, please set up your daily nutrition goals in
                  Nutrition Tracking under Planning.
                </p>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (window.location.hash = "#/nutrition")}
                  >
                    Set Nutrition Goals
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="my-recipes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-recipes">My Recipes</TabsTrigger>
            <TabsTrigger value="ai-recommendations">
              AI Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-recipes">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRecipes?.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  showDelete={recipe.createdBy === user?.id}
                  hideEditDelete={false}
                />
              ))}
            </div>
            {filteredRecipes?.length === 0 && (
              <div className="text-center py-12">
                <Utensils className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No recipes found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or create a new recipe
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-recommendations">
            <RecipeRecommendations />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
