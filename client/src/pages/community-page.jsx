import { useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Loader2, Trash2, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreatePostDialog } from "@/components/create-post-dialog"
import { EditPostDialog } from "@/components/edit-post-dialog"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { toast } from "sonner"

const LABELS = {
  RECIPE_SHARE: "Recipe",
  FOOD_RESCUE: "Food rescue",
  COOKING_TIP: "Cooking tip"
}

export default function CommunityPage() {
  useEffect(() => {
    document.title = "Community | NutriVerseAI"
  }, [])

  const { data: posts = [], isLoading } = useQuery({ queryKey: ["/api/community"] })

  const remove = useMutation({
    mutationFn: id => apiRequest("DELETE", `/api/community/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community"] })
      toast.success("Post deleted")
    }
  })

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">
            Your board of shared recipes, cooking tips and food-rescue ideas
          </p>
        </div>
        <CreatePostDialog />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            No posts yet. Share a recipe or a tip to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map(post => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{LABELS[post.type] || post.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {post.recipe && <CardTitle className="text-lg">{post.recipe.title}</CardTitle>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap">{post.content}</p>
                <div className="flex gap-2">
                  <EditPostDialog
                    post={post}
                    trigger={<Button variant="outline" size="sm">Edit</Button>}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(post.id)}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
