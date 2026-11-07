import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function MaintenanceScheduleView({
  schedule,
  equipment,
  onScheduleUpdated
}) {
  const [completingTask, setCompletingTask] = useState(null)
  const { toast } = useToast()

  const completeMaintenanceTask = async equipmentId => {
    setCompletingTask(equipmentId)
    try {
      const response = await fetch(
        `/api/kitchen-equipment/${equipmentId}/maintenance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            maintenanceDate: new Date().toISOString()
          })
        }
      )

      if (!response.ok) throw new Error("Failed to update maintenance")

      toast({
        title: "Success",
        description: "Maintenance record updated"
      })

      onScheduleUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update maintenance record",
        variant: "destructive"
      })
    } finally {
      setCompletingTask(null)
    }
  }

  const getPriorityColor = priority => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getEquipmentName = id => {
    // Convert string id from maintenance schedule to number for equipment lookup
    return (
      equipment.find(e => e.id === parseInt(id))?.name || "Unknown Equipment"
    )
  }

  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            No maintenance schedule available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Maintenance Schedule</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onScheduleUpdated}
            className="flex items-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Refresh Schedule
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {schedule.map(item => (
              <div
                key={item.equipmentId}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {getEquipmentName(item.equipmentId)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Next maintenance:{" "}
                      {new Date(item.nextMaintenanceDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(item.priority)}>
                    {item.priority} priority
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Maintenance Tasks:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {item.tasks.map((task, index) => (
                      <li key={index}>{task}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Est. duration: {item.estimatedDuration}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => completeMaintenanceTask(item.equipmentId)}
                    disabled={completingTask === item.equipmentId}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {completingTask === item.equipmentId
                      ? "Updating..."
                      : "Mark Complete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
