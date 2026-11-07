import { useEffect, useState } from "react"
import { convertToKitchenEquipment } from "./utils"
import {
  getEquipmentRecommendations,
  generateMaintenanceSchedule,
  getRecipesByEquipment
} from "../../ai-services/kitchen-ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Settings, ShoppingCart, ChefHat } from "lucide-react"
import { AddEquipmentDialog } from "./AddEquipmentDialog"
import { MaintenanceScheduleView } from "./MaintenanceScheduleView"
import { EquipmentList } from "./EquipmentList"
import { RecommendationsView } from "./RecommendationsView"
import config from "@/lib/config"

export function KitchenEquipment() {
  const [equipment, setEquipment] = useState([])
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("inventory")
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState(null)
  const [maintenanceSchedule, setMaintenanceSchedule] = useState(null)
  const [recipeMatches, setRecipeMatches] = useState(null)

  useEffect(() => {
    fetchEquipment()
  }, [])

  const fetchEquipment = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/kitchen-equipment`, {
        credentials: "include"
      })
      const data = await response.json()
      setEquipment(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch kitchen equipment",
        variant: "destructive"
      })
    }
  }

  const updateAnalytics = async () => {
    setLoading(true)
    try {
      const userPreferences = ["Italian", "Healthy"] // Replace with actual preferences

      // Convert DB equipment to KitchenEquipment type for AI functions
      const convertedEquipment = equipment.map(convertToKitchenEquipment)

      // Fetch all AI-powered insights in parallel
      const [
        recsByEquip,
        maintSchedule,
        equipRecommendations
      ] = await Promise.all([
        getRecipesByEquipment(convertedEquipment, userPreferences),
        generateMaintenanceSchedule(
          convertedEquipment,
          new Date().toISOString(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        ),
        getEquipmentRecommendations(convertedEquipment, userPreferences)
      ])

      setRecipeMatches(recsByEquip)
      setMaintenanceSchedule(maintSchedule)
      setRecommendations(equipRecommendations)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update kitchen analytics",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kitchen Equipment</h1>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Equipment
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="shopping" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Recommendations
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" /> Recipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentList
                equipment={equipment.map(convertToKitchenEquipment)}
                onEquipmentUpdated={fetchEquipment}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceScheduleView
            schedule={maintenanceSchedule}
            equipment={equipment.map(convertToKitchenEquipment)}
            onScheduleUpdated={() => updateAnalytics()}
          />
        </TabsContent>

        <TabsContent value="shopping">
          <RecommendationsView
            recommendations={recommendations}
            onRecommendationAction={item => {
              setShowAddDialog(true)
              // Pre-fill the add dialog with the recommended item
            }}
          />
        </TabsContent>

        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Possibilities</CardTitle>
            </CardHeader>
            <CardContent>
              {recipeMatches && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Recipes You Can Make
                    </h3>
                    <ScrollArea className="h-[200px]">
                      <ul className="space-y-2">
                        {recipeMatches.possibleRecipes.map(recipe => (
                          <li
                            key={recipe.id}
                            className="flex items-center justify-between"
                          >
                            <span>{recipe.title}</span>
                            <div className="flex gap-2">
                              {recipe.requiredEquipment.map(eq => (
                                <Badge key={eq} variant="secondary">
                                  {eq}
                                </Badge>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Recommended Purchases
                    </h3>
                    <ScrollArea className="h-[200px]">
                      <ul className="space-y-2">
                        {recipeMatches.recommendedPurchases.map((rec, i) => (
                          <li key={i} className="border-b pb-2">
                            <p className="font-medium">{rec.equipment}</p>
                            <p className="text-sm text-muted-foreground">
                              Enables: {rec.enabledRecipes.join(", ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddEquipmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onEquipmentAdded={() => {
          fetchEquipment()
          updateAnalytics()
        }}
      />
    </div>
  )
}
