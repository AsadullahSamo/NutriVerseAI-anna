import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import config from "@/lib/config"

const EQUIPMENT_CATEGORIES = [
  "Cookware",
  "Small Appliances",
  "Large Appliances",
  "Utensils",
  "Bakeware",
  "Food Storage",
  "Knives",
  "Other"
]

export function AddEquipmentDialog({
  open,
  onOpenChange,
  onEquipmentAdded,
  initialData
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: initialData || {
      name: "",
      category: "",
      condition: "excellent",
      purchaseDate: new Date().toISOString().split("T")[0],
      maintenanceInterval: 30,
      purchasePrice: ""
    }
  })

  const { toast } = useToast()
  const categoryValue = watch("category")
  const conditionValue = watch("condition")

  const onSubmit = async data => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/kitchen-equipment`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error("Failed to add equipment")

      toast({
        title: "Success",
        description: "Equipment added successfully"
      })

      reset()
      onOpenChange(false)
      onEquipmentAdded()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add equipment",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Kitchen Equipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register("name", { required: true })}
                className={errors.name ? "border-red-500" : ""}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <CustomSelect
                value={categoryValue || ""}
                onValueChange={value => {
                  console.log("Category selected:", value);
                  setValue("category", value);
                }}
                placeholder="Select category"
                className="w-full"
              >
                {EQUIPMENT_CATEGORIES.map(category => (
                  <CustomSelectItem
                    key={category}
                    value={category.toLowerCase()}
                  >
                    {category}
                  </CustomSelectItem>
                ))}
              </CustomSelect>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <CustomSelect
                value={conditionValue || ""}
                onValueChange={value => {
                  console.log("Condition selected:", value);
                  setValue("condition", value);
                }}
                placeholder="Select condition"
                className="w-full"
              >
                <CustomSelectItem value="excellent">
                  Excellent
                </CustomSelectItem>
                <CustomSelectItem value="good">
                  Good
                </CustomSelectItem>
                <CustomSelectItem value="fair">
                  Fair
                </CustomSelectItem>
                <CustomSelectItem value="needs-maintenance">
                  Needs Maintenance
                </CustomSelectItem>
                <CustomSelectItem value="replace">
                  Replace
                </CustomSelectItem>
              </CustomSelect>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...register("purchaseDate")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maintenanceInterval">
                Maintenance Interval (days)
              </Label>
              <Input
                id="maintenanceInterval"
                type="number"
                {...register("maintenanceInterval", { min: 0 })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
              <Input
                id="purchasePrice"
                type="number"
                {...register("purchasePrice", { min: 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">Add Equipment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
