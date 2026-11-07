import React from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function EquipmentList({ equipment, onEquipmentUpdated }) {
  const { toast } = useToast()

  const deleteEquipment = async id => {
    if (!confirm("Are you sure you want to delete this equipment?")) return

    try {
      const response = await fetch(`/api/kitchen-equipment/${id}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Failed to delete equipment")

      toast({
        title: "Success",
        description: "Equipment deleted successfully"
      })

      onEquipmentUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete equipment",
        variant: "destructive"
      })
    }
  }

  const getConditionColor = condition => {
    switch (condition.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-800"
      case "good":
        return "bg-blue-100 text-blue-800"
      case "fair":
        return "bg-yellow-100 text-yellow-800"
      case "needs-maintenance":
        return "bg-orange-100 text-orange-800"
      case "replace":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No equipment added yet. Add some equipment to get started!
      </div>
    )
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {equipment.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <Badge variant="secondary">{item.category}</Badge>
                  <Badge className={getConditionColor(item.condition)}>
                    {item.condition}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.purchaseDate && (
                    <p>
                      Purchased:{" "}
                      {new Date(item.purchaseDate).toLocaleDateString()}
                    </p>
                  )}
                  {item.lastMaintenanceDate && (
                    <p>
                      Last maintained:{" "}
                      {new Date(item.lastMaintenanceDate).toLocaleDateString()}
                    </p>
                  )}
                  {item.maintenanceInterval && (
                    <p>Maintenance interval: {item.maintenanceInterval} days</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    // TODO: Implement edit functionality
                    toast({
                      title: "Coming Soon",
                      description: "Edit functionality will be available soon"
                    })
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => deleteEquipment(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
