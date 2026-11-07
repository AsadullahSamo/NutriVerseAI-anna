import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Loader2 } from "lucide-react"

export function EditPostDialog({ post, trigger }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState(post.content)
  const [type, setType] = useState(post.type)
  const { toast } = useToast()

  const { data: recipes } = useQuery({
    queryKey: ["/api/recipes"],
    enabled: type === "RECIPE_SHARE"
  })

  const [selectedRecipeId, setSelectedRecipeId] = useState(
    post.recipeId?.toString() || ""
  )

  const editPostMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        content,
        type,
        recipeId:
          type === "RECIPE_SHARE" && selectedRecipeId
            ? parseInt(selectedRecipeId)
            : null
      }
      const res = await apiRequest(
        "PATCH",
        `/api/community/${post.id}`,
        payload
      )
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community"] })
      setOpen(false)
      toast({
        title: "Post updated!",
        description: "Your post has been updated successfully."
      })
    }
  })



  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: () => setOpen(true)
        })
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Post
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Update your post content and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 dialog-scroll-area pr-2 min-h-0">
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Post Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="navbar-dropdown-trigger"
                >
                  <option value="RECIPE_SHARE">Share Recipe</option>
                  <option value="FOOD_RESCUE">Food Rescue</option>
                  <option value="COOKING_TIP">Cooking Tip</option>
                </select>
              </div>

              {type === "RECIPE_SHARE" && (
                <CustomSelect
                  value={selectedRecipeId}
                  onValueChange={setSelectedRecipeId}
                  placeholder="Select a recipe to share"
                >
                  {recipes?.map(recipe => (
                    <CustomSelectItem key={recipe.id} value={recipe.id.toString()}>
                      {recipe.title}
                    </CustomSelectItem>
                  ))}
                </CustomSelect>
              )}

              <Textarea
                placeholder="What would you like to share?"
                value={content}
                onChange={e => setContent(e.target.value)}
              />

              <Button
                className="w-full"
                onClick={() => editPostMutation.mutate()}
                disabled={editPostMutation.isPending}
              >
                {editPostMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
