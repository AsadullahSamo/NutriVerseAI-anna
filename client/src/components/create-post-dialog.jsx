import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { toast } from "sonner"
import { Share2 } from "lucide-react"

export function CreatePostDialog({ trigger }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [type, setType] = useState("RECIPE_SHARE")
  const { user } = useAuth()

  const { data: recipes } = useQuery({
    queryKey: ["/api/recipes"],
    enabled: type === "RECIPE_SHARE"
  })

  const [selectedRecipeId, setSelectedRecipeId] = useState("")

  const createPostMutation = useMutation({
    mutationFn: async data => {
      try {
        console.log('[Client] Creating post with data:', data);

        const payload = {
          content: data.content,
          type: data.type
          // Don't send userId - let server get it from req.user
        }

        if (data.type === "RECIPE_SHARE" && data.recipeId) {
          payload.recipeId = parseInt(data.recipeId)
        }

        console.log('[Client] Sending payload:', payload);

        const res = await apiRequest("POST", "/api/community", payload)
        if (!res.ok) {
          const errorData = await res.json()
          console.error('[Client] Server error response:', errorData);
          throw new Error(errorData.message || "Failed to create post")
        }
        const result = await res.json()
        console.log('[Client] Post created successfully:', result);
        return result
      } catch (error) {
        console.error("Create post error:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community"] })
      setOpen(false)
      setContent("")
      setSelectedRecipeId("")
      toast.success("Post created!", {
        description: "Your post has been shared with the community."
      })
    },
    onError: error => {
      toast.error("Error", {
        description:
          error.message || "Failed to create post. Please try again."
      })
    }
  })

  const handleCreatePost = () => {
    if (type === "RECIPE_SHARE" && !selectedRecipeId) {
      toast.error("Error", {
        description: "Please select a recipe to share"
      })
      return
    }

    const postData = {
      content,
      type,
      // Don't send userId - let server get it from req.user
      ...(type === "RECIPE_SHARE" && selectedRecipeId
        ? { recipeId: parseInt(selectedRecipeId) }
        : {})
    }

    createPostMutation.mutate(postData)
  }



  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: () => setOpen(true)
        })
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Share2 className="h-4 w-4 mr-2" />
          Share with Community
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Share your thoughts, recipes, or tips with the community.
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Recipe</label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="navbar-dropdown-trigger"
                  >
                    <option value="">Select a recipe to share</option>
                    {recipes &&
                      recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id.toString()}>
                          {recipe.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <Textarea
                placeholder="What would you like to share?"
                value={content}
                onChange={e => setContent(e.target.value)}
                className="min-h-[150px]"
              />
              <Button
                className="w-full"
                onClick={handleCreatePost}
                disabled={
                  !content.trim() ||
                  createPostMutation.isPending ||
                  (type === "RECIPE_SHARE" && !selectedRecipeId)
                }
              >
                {createPostMutation.isPending ? "Creating..." : "Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
