import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Wand2, Loader2, Plus } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { z } from "zod"
import { generateCuisineDetailsFromName } from "@/ai-services/cultural-cuisine-service"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  region: z.string().min(1, "Region is required"),
  description: z.string().min(1, "Description is required"),
  keyIngredients: z.array(z.string()),
  cookingTechniques: z.array(z.string()),
  culturalContext: z.object({
    history: z.string(),
    traditions: z.string(),
    festivals: z.string(),
    influences: z.string()
  }),
  servingEtiquette: z.object({
    tableSettings: z.string(),
    diningCustoms: z.string(),
    servingOrder: z.string(),
    taboos: z.string(),
    summary: z.string()
  })
})

export function CreateCulturalCuisineDialog({ trigger }) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      region: "",
      description: "",
      keyIngredients: [],
      cookingTechniques: [],
      culturalContext: {
        history: "",
        traditions: "",
        festivals: "",
        influences: ""
      },
      servingEtiquette: {
        tableSettings: "",
        diningCustoms: "",
        servingOrder: "",
        taboos: "",
        summary: ""
      }
    }
  })

  const generateAIDetails = async () => {
    const name = form.getValues("name")
    const region = form.getValues("region")

    if (!name || !region) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and region to generate details.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      // Import config to get the API base URL
      const config = (await import("@/lib/config")).default;
      console.log("Using API base URL:", config.apiBaseUrl);
      
      const details = await generateCuisineDetailsFromName(name, region)

      form.setValue("description", details.description)
      form.setValue("keyIngredients", details.keyIngredients)
      form.setValue("cookingTechniques", details.cookingTechniques)
      form.setValue("culturalContext", details.culturalContext)
      form.setValue("servingEtiquette", details.servingEtiquette)

      toast({
        title: "Details Generated",
        description:
          "AI has generated cultural cuisine details based on the name and region."
      })
    } catch (error) {
      console.error("AI generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate details. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const onSubmit = async data => {
    try {
      // Import config to get the API base URL
      const config = (await import("@/lib/config")).default;
      const apiUrl = `${config.apiBaseUrl}/api/cultural-cuisines`;
      
      console.log("Submitting to URL:", apiUrl);
      console.log("Submission data:", data);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json" 
        },
        credentials: "include",
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API error response:", errorData);
        throw new Error(errorData.message || errorData.error || "Failed to create cultural cuisine");
      }

      const cuisine = await response.json();
      console.log("Created cuisine:", cuisine);
      setOpen(false);
      form.reset();
      toast({
        title: "Cultural Cuisine Created",
        description: "Your cultural cuisine has been added successfully."
      });
    } catch (error) {
      console.error("Creation error:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create cultural cuisine. Please try again.",
        variant: "destructive"
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Alert className="mb-6 border-green-500">
        <Info className="size-4 text-yellow-500" />
        <AlertDescription className="ml-2">
          <span>
            Enter the title of the recipe and click the{" "}
            <span className="inline-flex mx-2 font-bold">
              <Sparkles className="size-4 text-green-500 mr-2" /> Generate
            </span>{" "}
            button to auto-fill recipe details using AI. You'll need to add an
            image URL manually as AI generated image urls are not always
            accurate.
          </span>
        </AlertDescription>
      </Alert>

      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Cultural Cuisine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Cultural Cuisine</DialogTitle>
          <DialogDescription>
            Add a new cultural cuisine to your collection.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Japanese Cuisine" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., East Asia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateAIDetails}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Details...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Details with AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the cuisine..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Cultural Context</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="culturalContext.history"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>History</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Historical background..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="culturalContext.traditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Traditions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Culinary traditions..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="culturalContext.festivals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Festivals</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Food-related festivals..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="culturalContext.influences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Influences</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cultural influences..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Serving Etiquette</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="servingEtiquette.tableSettings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Settings</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Table arrangement guidelines..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingEtiquette.diningCustoms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dining Customs</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Dining rules..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingEtiquette.servingOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serving Order</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Course sequence..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingEtiquette.taboos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taboos</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Things to avoid..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingEtiquette.summary"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>General Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Overall dining etiquette summary..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Cuisine</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

