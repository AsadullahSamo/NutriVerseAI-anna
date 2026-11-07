import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Globe,
  PlusCircle,
  Loader2,
  Sparkles,
  Info
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateCuisineDetailsFromName } from "@/ai-services/cultural-cuisine-service"

export function CuisineList({ cuisines, onSelectCuisine, viewFilter = "all" }) {
  const [isAddingCuisine, setIsAddingCuisine] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Filter out hidden cuisines and apply view filter
  const visibleCuisines = useMemo(() => {
    const hiddenCuisines = JSON.parse(
      localStorage.getItem("hiddenCuisines") || "[]"
    )
    let filtered = cuisines.filter(cuisine => !hiddenCuisines.includes(cuisine.id))

    // Apply view filter
    if (viewFilter === "my" && user) {
      filtered = filtered.filter(cuisine => cuisine.createdBy === user.id)
    }

    return filtered
  }, [cuisines, viewFilter, user])

  // Format the key ingredients for display
  const formatKeyIngredients = ingredients => {
    if (Array.isArray(ingredients)) {
      return (
        ingredients.slice(0, 5).join(", ") +
        (ingredients.length > 5 ? "..." : "")
      )
    }
    if (ingredients && typeof ingredients === "object") {
      const values = Object.values(ingredients)
      return values.slice(0, 5).join(", ") + (values.length > 5 ? "..." : "")
    }
    return "Information not available"
  }

  const generateAIDetails = async form => {
    const formData = new FormData(form)
    const name = formData.get("name")
    const region = formData.get("region")

    if (!name && !region) {
      toast({
        title: "Missing Information",
        description: "Please enter either name or region to generate details.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const details = await generateCuisineDetailsFromName(
        name || region,
        region || name
      )
      
      console.log("[Client] Generated details:", details);
      console.log("[Client] KeyIngredients type:", typeof details.keyIngredients);
      console.log("[Client] CookingTechniques type:", typeof details.cookingTechniques);
      console.log("[Client] Full details object keys:", Object.keys(details));

      // Update form fields with generated details
      const nameInput = form.querySelector('input[name="name"]')
      const regionInput = form.querySelector('input[name="region"]')
      const descriptionInput = form.querySelector(
        'textarea[name="description"]'
      )
      const keyIngredientsInput = form.querySelector(
        'textarea[name="keyIngredients"]'
      )
      const cookingTechniquesInput = form.querySelector(
        'textarea[name="cookingTechniques"]'
      )
      const bannerUrlInput = form.querySelector('input[name="bannerUrl"]')

      // Update name and region if they were empty
      if (!name && nameInput)
        nameInput.value =
          details.culturalContext?.history?.split(" ")[0] + " Cuisine" || nameInput.value
      if (!region && regionInput)
        regionInput.value =
          details.culturalContext?.influences?.split(" ")[0] + " Region" || regionInput.value

      if (descriptionInput) descriptionInput.value = details.description || ""
      
      // Handle keyIngredients
      if (keyIngredientsInput) {
        console.log("[Client] Setting keyIngredients value:", details.keyIngredients);
        if (Array.isArray(details.keyIngredients)) {
          keyIngredientsInput.value = details.keyIngredients.join("\n");
        } else if (typeof details.keyIngredients === 'string') {
          keyIngredientsInput.value = details.keyIngredients;
        } else if (details.keyIngredients) {
          keyIngredientsInput.value = String(details.keyIngredients);
        } else {
          console.warn("[Client] keyIngredients is undefined or null");
          keyIngredientsInput.value = "";
        }
      }
      
      // Handle cookingTechniques
      if (cookingTechniquesInput) {
        console.log("[Client] Setting cookingTechniques value:", details.cookingTechniques);
        if (Array.isArray(details.cookingTechniques)) {
          cookingTechniquesInput.value = details.cookingTechniques.join("\n");
        } else if (typeof details.cookingTechniques === 'string') {
          cookingTechniquesInput.value = details.cookingTechniques;
        } else if (details.cookingTechniques) {
          cookingTechniquesInput.value = String(details.cookingTechniques);
        } else {
          console.warn("[Client] cookingTechniques is undefined or null");
          cookingTechniquesInput.value = "";
        }
      }

      if (bannerUrlInput)
        bannerUrlInput.value = `https://source.unsplash.com/800x600/?${encodeURIComponent(
          (name || region).toLowerCase() + " food"
        )}`

      toast({
        title: "Details Generated",
        description:
          "AI has generated cultural cuisine details. Please review and manually enter a banner image URL that best represents this cuisine."
      })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate details. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Add cuisine handler with proper cache invalidation
  const handleAddCuisine = async event => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const newCuisine = {
        name: formData.get("name"),
        region: formData.get("region"),
        description: formData.get("description"),
        bannerUrl: formData.get("bannerUrl"),
        keyIngredients: formData
          .get("keyIngredients")
          .split("\n")
          .map(i => i.trim())
          .filter(Boolean),
        cookingTechniques: formData
          .get("cookingTechniques")
          .split("\n")
          .map(t => t.trim())
          .filter(Boolean),
        culturalContext: {
          history: "To be added",
          significance: "To be added"
        },
        servingEtiquette: {
          general: "To be added"
        }
      }

      const config = (await import("@/lib/config")).default;
      const apiUrl = `${config.apiBaseUrl}/api/cultural-cuisines`;
      
      console.log("Submitting cuisine to:", apiUrl);
      console.log("Cuisine data:", newCuisine);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        credentials: "include",
        body: JSON.stringify(newCuisine)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", errorData);
        throw new Error(errorData.message || errorData.error || "Failed to add cuisine");
      }

      // Get the newly added cuisine data
      const addedCuisine = await response.json()

      // Force immediate invalidation and refetch
      await queryClient.invalidateQueries({ queryKey: ["cuisines"] })
      await queryClient.invalidateQueries({
        queryKey: ["/api/cultural-cuisines"]
      })
      await queryClient.refetchQueries({ queryKey: ["cuisines"] })
      await queryClient.refetchQueries({ queryKey: ["/api/cultural-cuisines"] })

      toast({
        title: "Success",
        description: "New cuisine has been added successfully."
      })

      setIsAddingCuisine(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add cuisine. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Explore World Cuisines</h2>
        <Button onClick={() => setIsAddingCuisine(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          {cuisines.length === 0 ? "Add Your First Cuisine" : "Add New Cuisine"}
        </Button>
      </div>

      <Dialog open={isAddingCuisine} onOpenChange={setIsAddingCuisine}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
          <ScrollArea className="max-h-[80vh] overflow-y-auto pr-4">
            <Alert className="mb-6 border-green-500">
              <Info className="size-4 text-yellow-500" />
              <AlertDescription className="ml-2">
                <span>
                  {/* Enter the title of the recipe and click the <span className="inline-flex mx-2 font-bold"><Sparkles className="size-4 text-green-500 mr-2" /> Generate</span> button to auto-fill recipe details using AI. You'll need to add an image URL manually as AI generated image urls are not always accurate. */}
                  Enter the name of the cuisine and click the{" "}
                  <span className="inline-flex mx-2 font-bold">
                    <Sparkles className="size-4 text-green-500 mr-2" /> Generate
                  </span>{" "}
                  button to auto-fill cuisine details using AI. You'll need to
                  add an image URL manually as AI generated image urls are not
                  always accurate.
                </span>
              </AlertDescription>
            </Alert>

            <DialogHeader>
              <DialogTitle>Add New Cuisine</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCuisine} className="space-y-8 py-4">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    name="name"
                    placeholder="e.g., Thai, Mexican, Italian"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium">Region</label>
                  <Input
                    name="region"
                    placeholder="e.g., Southeast Asia, Latin America"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={e => {
                      const form = e.currentTarget.closest("form")
                      if (form) generateAIDetails(form)
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-green-500" />
                        Generating Details...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 text-green-500" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    name="description"
                    placeholder="Brief description of the cuisine..."
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium">
                    Banner Image URL
                  </label>
                  <Input
                    name="bannerUrl"
                    placeholder="https://example.com/banner.jpg"
                    type="url"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a wide banner image that showcases the cuisine
                  </p>
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium">Key Ingredients</label>
                  <Textarea
                    name="keyIngredients"
                    placeholder="Enter each ingredient on a new line&#10;e.g.,&#10;Rice&#10;Garlic&#10;Ginger&#10;Soy Sauce"
                    required
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each ingredient on a new line
                  </p>
                </div>
                <div className="space-y-2.5">
                  <label className="text-sm font-medium">
                    Cooking Techniques
                  </label>
                  <Textarea
                    name="cookingTechniques"
                    placeholder="Enter each technique on a new line&#10;e.g.,&#10;Stir-frying&#10;Steaming&#10;Grilling"
                    required
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each technique on a new line
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Cuisine"}
              </Button>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {visibleCuisines.map(cuisine => (
            <Card
              key={cuisine.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectCuisine(cuisine.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {cuisine.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {cuisine.region}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {cuisine.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

