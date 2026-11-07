import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/ui/icons"
import { useForm } from "react-hook-form"
import { useAuth } from "@/hooks/use-auth"
import { useKitchenInventory } from "./KitchenInventoryContext"

const categories = [
  "Appliances",
  "Cookware",
  "Bakeware",
  "Utensils",
  "Knives",
  "Storage",
  "Small Appliances",
  "Other"
]

const conditions = ["excellent", "good", "fair", "needs-maintenance", "replace"]

export function AddEquipmentDialog() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      name: "",
      category: "",
      condition: undefined,
      purchaseDate: undefined,
      maintenanceInterval: undefined
    }
  })

  React.useEffect(() => {
    register("category", { required: "Category is required" })
    register("condition", { required: "Condition is required" })
  }, [register])

  const { user } = useAuth()
  const { dispatch } = useKitchenInventory()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async data => {
    if (!user) return
    setLoading(true)

    try {
      const formattedData = {
        ...data,
        userId: user.id,
        lastMaintenanceDate: data.purchaseDate
          ? new Date().toISOString()
          : null,
        purchaseDate: data.purchaseDate
          ? new Date(data.purchaseDate).toISOString()
          : null,
        maintenanceInterval: data.maintenanceInterval || null
      }

      const response = await fetch("/api/kitchen-equipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData),
        credentials: "include"
      })

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to add equipment")
      }

      dispatch({ type: "ADD_EQUIPMENT", payload: responseData })
      setOpen(false)
      reset()
    } catch (error) {
      console.error("Failed to add equipment:", error)
      // Don't rethrow the error, just let the UI show the error state
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto mb-4">
          <Icons.plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Kitchen Equipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Equipment Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="e.g., Stand Mixer"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CustomSelect
              value={watch("category") || ""}
              onValueChange={value => {
                console.log("Category selected:", value);
                setValue("category", value, { shouldValidate: true });
              }}
              placeholder="Select category"
              className="w-full"
            >
              {categories.map(category => (
                <CustomSelectItem
                  key={category}
                  value={category}
                >
                  {category}
                </CustomSelectItem>
              ))}
            </CustomSelect>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <CustomSelect
              value={watch("condition") || ""}
              onValueChange={value => {
                console.log("Condition selected:", value);
                setValue("condition", value, { shouldValidate: true });
              }}
              placeholder="Select condition"
              className="w-full"
            >
              {conditions.map(condition => (
                <CustomSelectItem
                  key={condition}
                  value={condition}
                >
                  {condition.charAt(0).toUpperCase() + condition.slice(1)}
                </CustomSelectItem>
              ))}
            </CustomSelect>
            {errors.condition && (
              <p className="text-sm text-red-500">{errors.condition.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              {...register("purchaseDate")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceInterval">
              Maintenance Interval (days)
            </Label>
            <Input
              id="maintenanceInterval"
              type="number"
              {...register("maintenanceInterval", {
                setValueAs: v => (v === "" ? null : parseInt(v)),
                min: { value: 1, message: "Must be at least 1 day" }
              })}
              placeholder="e.g., 90"
            />
            {errors.maintenanceInterval && (
              <p className="text-sm text-red-500">
                {errors.maintenanceInterval.message}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Equipment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
