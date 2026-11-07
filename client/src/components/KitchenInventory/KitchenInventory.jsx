import { useState } from "react"
import { motion } from "framer-motion"
import {
  analyzeKitchenInventory,
  getMaintenanceTips
} from "@/ai-services/kitchen-inventory-ai"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { useKitchenInventory } from "./KitchenInventoryContext"
import { useAuth } from "@/hooks/use-auth"
import { AddEquipmentDialog } from "./AddEquipmentDialog"
import { DeleteEquipmentDialog } from "./DeleteEquipmentDialog"

const priorityColors = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800"
}

const conditionColors = {
  excellent: "bg-green-100 text-green-800",
  good: "bg-blue-100 text-blue-800",
  fair: "bg-yellow-100 text-yellow-800",
  "needs-maintenance": "bg-orange-100 text-orange-800",
  replace: "bg-red-100 text-red-800"
}

export function KitchenInventory() {
  const { state, dispatch } = useKitchenInventory()
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [maintenanceTips, setMaintenanceTips] = useState([])
  const [equipmentToDelete, setEquipmentToDelete] = useState(null)
  const { user } = useAuth()

  const handleAnalyze = async () => {
    if (!user) return
    dispatch({ type: "SET_LOADING", payload: true })
    try {
      const result = await analyzeKitchenInventory(state.equipment)
      dispatch({ type: "SET_ANALYSIS", payload: result })
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Analysis failed" })
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const handleEquipmentSelect = async item => {
    setSelectedEquipment(item)
    try {
      const tips = await getMaintenanceTips(item)
      setMaintenanceTips(tips)
    } catch (error) {
      console.error("Failed to fetch maintenance tips:", error)
    }
  }

  const handleEquipmentCardClick = item => {
    setSelectedEquipment(item)
    handleEquipmentSelect(item)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Kitchen Equipment Manager</h1>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <div className="mb-4">
            <AddEquipmentDialog />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.equipment.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
              >
                <Card>
                  <CardHeader onClick={() => handleEquipmentCardClick(item)}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <Badge className={conditionColors[item.condition]}>
                        {item.condition}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent onClick={() => handleEquipmentCardClick(item)}>
                    <p className="text-sm text-gray-600">
                      Category: {item.category}
                    </p>
                    {item.lastMaintenanceDate && (
                      <p className="text-sm text-gray-600">
                        Last Maintained:{" "}
                        {new Date(
                          item.lastMaintenanceDate
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        setEquipmentToDelete(item)
                      }}
                    >
                      <Icons.trash className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <Card className="mb-4">
            <CardContent className="pt-4">
              <Button
                onClick={handleAnalyze}
                disabled={state.loading}
                className="w-full md:w-auto"
              >
                {state.loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Kitchen Inventory"
                )}
              </Button>
            </CardContent>
          </Card>

          {state.analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">
                    Maintenance Recommendations
                  </h3>
                </CardHeader>
                <CardContent>
                  {state.analysis.maintenanceRecommendations.map((rec, idx) => (
                    <Alert key={idx} className="mb-2">
                      <AlertTitle className={priorityColors[rec.priority]}>
                        {rec.priority.toUpperCase()} Priority
                      </AlertTitle>
                      <AlertDescription>{rec.recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">
                    Shopping Recommendations
                  </h3>
                </CardHeader>
                <CardContent>
                  {state.analysis.shoppingRecommendations.map((rec, idx) => (
                    <Alert key={idx} className="mb-2">
                      <AlertTitle>{rec.itemName}</AlertTitle>
                      <AlertDescription>
                        {rec.reason}
                        {rec.estimatedPrice && (
                          <span className="block text-sm text-gray-600">
                            Estimated Price: {rec.estimatedPrice}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <h3 className="text-lg font-semibold">
                    Recipe Possibilities
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.analysis.recipeRecommendations.map((rec, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-4">
                          <h4 className="font-medium mb-2">{rec.recipeName}</h4>
                          <Badge
                            className={
                              rec.possibleWithCurrent
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {rec.possibleWithCurrent
                              ? "Ready to Cook"
                              : "Needs Equipment"}
                          </Badge>
                          <div className="mt-2 text-sm text-gray-600">
                            <p>Required Equipment:</p>
                            <ul className="list-disc list-inside">
                              {rec.requiredEquipment.map((eq, i) => (
                                <li key={i}>{eq}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="maintenance">
          {selectedEquipment ? (
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">
                  {selectedEquipment.name} Maintenance Guide
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceTips.map((tip, idx) => (
                    <Alert key={idx}>
                      <AlertDescription>{tip}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <p className="text-center text-gray-600">
                  Select an equipment item to view maintenance tips
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {equipmentToDelete && (
        <DeleteEquipmentDialog
          equipment={equipmentToDelete}
          open={!!equipmentToDelete}
          onOpenChange={open => !open && setEquipmentToDelete(null)}
        />
      )}
    </div>
  )
}
