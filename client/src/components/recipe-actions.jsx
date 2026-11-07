import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { EditRecipeDialog } from "./edit-recipe-dialog"

export function RecipeActions({
  recipe,
  size = "default",
  showDelete = false,
  hideEditDelete = false
}) {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteRecipeMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true)
      try {
        const res = await apiRequest("DELETE", `/api/recipes/${recipe.id}`)
        if (!res.ok) {
          throw new Error("Failed to delete recipe")
        }
        return { success: true }
      } catch (error) {
        toast.error("Error", {
          description: "Failed to delete recipe. Please try again."
        })
        throw error
      } finally {
        setIsDeleting(false)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] })
      queryClient.invalidateQueries({ queryKey: ["/api/community"] })
      queryClient.invalidateQueries({ queryKey: ["recommendedRecipes"] })
      toast.success("Recipe deleted", {
        description: "Recipe has been deleted successfully."
      })
    }
  })



  if (!user) return null

  return (
    <div className="flex items-center justify-end -mr-1">
      {!hideEditDelete && showDelete && (
        <>
          <EditRecipeDialog
            recipe={recipe}
            trigger={
              <Button
                variant="ghost"
                size={size}
                className="h-7 px-3 text-sm hover:bg-secondary"
              >
                <Pencil className="h-4 w-4" />
                <span className="ml-2">Edit</span>
              </Button>
            }
          />
          <Button
            variant="ghost"
            size={size}
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to delete this recipe? This action cannot be undone."
                )
              ) {
                deleteRecipeMutation.mutate()
              }
            }}
            disabled={isDeleting || deleteRecipeMutation.isPending}
            className="h-7 px-3 text-sm hover:bg-secondary"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="ml-2">{isDeleting ? "..." : "Delete"}</span>
          </Button>
        </>
      )}
    </div>
  )
}
