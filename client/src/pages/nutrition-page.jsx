import { NutritionGoals } from "@/components/nutrition-goals"
import { NutritionInsights } from "@/components/nutrition-insights"
import { NutritionSummary } from "@/components/nutrition-summary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function NutritionPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Nutrition Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your nutritional goals and get AI-powered insights
          </p>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList>
            <TabsTrigger value="daily">Daily Progress</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <NutritionGoals />
          </TabsContent>

          <TabsContent value="summary">
            <NutritionSummary />
          </TabsContent>

          <TabsContent value="insights">
            <NutritionInsights />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
