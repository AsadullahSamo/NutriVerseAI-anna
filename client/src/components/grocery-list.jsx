import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useMutation } from "@tanstack/react-query"
import { Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export function GroceryList({ list }) {
  const [items, setItems] = useState(list.items)
  const [newItem, setNewItem] = useState("")
  const [newQuantity, setNewQuantity] = useState("1")
  const { toast } = useToast()

  const updateMutation = useMutation({
    mutationFn: async updatedList => {
      const res = await apiRequest(
        "PATCH",
        `/api/grocery-lists/${list.id}`,
        updatedList
      )
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-lists"] })
      toast({
        title: "List updated",
        description: "Your grocery list has been updated."
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/grocery-lists/${list.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-lists"] })
      toast({
        title: "List deleted",
        description: "Your grocery list has been deleted."
      })
    }
  })

  const toggleItem = itemId => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    setItems(updatedItems)
    updateMutation.mutate({ ...list, items: updatedItems, title: list.title })
  }

  const removeItem = itemId => {
    const updatedItems = items.filter(item => item.id !== itemId)
    setItems(updatedItems)
    updateMutation.mutate({ ...list, items: updatedItems, title: list.title })
  }

  const addItem = () => {
    if (!newItem.trim()) return

    const newItemObject = {
      id: crypto.randomUUID(),
      name: newItem.trim(),
      completed: false,
      quantity: newQuantity
    }

    const updatedItems = [...items, newItemObject]
    setItems(updatedItems)
    updateMutation.mutate({
      ...list,
      items: updatedItems,
      title: list.title || "Shopping List" // Ensure title is maintained
    })
    setNewItem("")
    setNewQuantity("1")
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="font-semibold">{list.title || "Shopping List"}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add item..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyPress={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addItem()
                }
              }}
            />
            <Input
              type="number"
              value={newQuantity}
              onChange={e => setNewQuantity(e.target.value)}
              className="w-20"
              min="1"
            />
            <Button onClick={addItem} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleItem(item.id)}
                />
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span
                      className={
                        item.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={
                            item.priority === "high"
                              ? "border-red-500 text-red-500"
                              : item.priority === "medium"
                              ? "border-yellow-500 text-yellow-500"
                              : "border-green-500 text-green-500"
                          }
                        >
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-center text-muted-foreground">
              No items in this list yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
