import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { toast } from "sonner"
import {
  SmilePlus,
  ChartLine,
  Sparkles,
  Loader2,
  Trash2,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Heart,
  TrendingUp,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function MoodTracker({ recipeId }) {
  const [entry, setEntry] = useState("")
  const [showInsights, setShowInsights] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const moodEntriesQuery = useQuery({
    queryKey: ["moodEntries", recipeId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mood-journal/${recipeId}`)
      return res.json()
    }
  })

  const moodMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mood-journal", {
        recipeId,
        entry,
        userId: user?.id,
        timestamp: new Date().toISOString()
      })
      return res.json()
    },
    onSuccess: () => {
      setEntry("")
      toast.success("Mood tracked!", {
        description:
          "Your cooking experience has been recorded and analyzed. Now click on 'View Insights' to see patterns and recommendations OR add more entries to see how your mood evolves."
      })
      moodEntriesQuery.refetch()
    }
  })

  const deleteMoodEntryMutation = useMutation({
    mutationFn: async timestamp => {
      const res = await apiRequest(
        "DELETE",
        `/api/mood-journal/${recipeId}/${encodeURIComponent(timestamp)}`
      )
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moodEntries", recipeId] })
      toast.success("Entry deleted", {
        description: "Your cooking experience entry has been deleted."
      })
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to delete entry. Please try again."
      })
    }
  })

  // Modify insights query to use proper caching and prevent unnecessary requests
  const insightsQuery = useQuery({
    queryKey: ["moodInsights", recipeId],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/mood-journal/${recipeId}/insights`
      )
      if (!res.ok) {
        throw new Error("Failed to load insights")
      }
      return res.json()
    },
    enabled: false, // Don't fetch automatically
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes before garbage collection
    retry: 1 // Only retry once
  })

  // Handle showing insights with proper error handling and caching
  const handleShowInsights = () => {
    if (!moodEntriesQuery.data?.length) {
      toast("No entries", {
        description: "Add some cooking experiences first to view insights."
      })
      return
    }

    // Check if we have valid cached data
    const cachedData = queryClient.getQueryData(["moodInsights", recipeId])
    if (cachedData) {
      setShowInsights(true)
    }

    // Fetch new data only if needed
    insightsQuery.refetch()
    setShowInsights(true)
  }

  const getBadgeColorsByType = type => {
    switch (type) {
      case "highlight":
        return "bg-primary/10 text-primary border-primary/20"
      case "observation":
        return "bg-blue-500/10 text-blue-600 border-blue-200"
      case "tip":
        return "bg-green-500/10 text-green-600 border-green-200"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <SmilePlus className="h-5 w-5 text-primary" />
          Cooking Experience Journal
        </h3>
        {(moodEntriesQuery.data ?? []).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowInsights}
            className="hover:bg-primary/10"
            // Disable while fetching
            disabled={insightsQuery.isFetching}
          >
            {insightsQuery.isFetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChartLine className="h-4 w-4 mr-2 text-primary" />
                View Insights
              </>
            )}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-sm text-muted-foreground">
            How did cooking this recipe make you feel?
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Textarea
            placeholder="Share your cooking experience, emotions, and any challenges or triumphs..."
            value={entry}
            onChange={e => setEntry(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => moodMutation.mutate()}
              disabled={!entry.trim() || moodMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {moodMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <SmilePlus className="h-4 w-4 mr-2" />
                  Track Mood
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {(moodEntriesQuery.data ?? []).map((moodEntry, index) => (
          <Card
            key={index}
            className="overflow-hidden hover:shadow-md transition-shadow"
          >
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {new Date(moodEntry.timestamp).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this cooking experience
                        entry? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteMoodEntryMutation.mutate(moodEntry.timestamp)
                        }
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="mb-4 leading-relaxed text-muted-foreground">
                {moodEntry.entry}
              </p>
              {moodEntry.emotions &&
                Array.isArray(moodEntry.emotions) &&
                moodEntry.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {moodEntry.emotions.map((emotion, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Mood Insights & Patterns
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 h-[calc(80vh-8rem)]">
            <div className="px-1 py-4 space-y-6">
              {insightsQuery.isLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">
                        Analyzing your mood patterns...
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : insightsQuery.error ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                      <p className="text-muted-foreground">
                        Failed to load insights. Please try again.
                      </p>
                      <Button
                        onClick={() => insightsQuery.refetch()}
                        variant="outline"
                        size="sm"
                      >
                        Retry
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-lg font-medium tracking-tight text-muted-foreground">
                        {insightsQuery.data?.summary}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    {insightsQuery.data?.patterns?.map((pattern, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            {pattern.category === "Skills" && (
                              <GraduationCap className="h-4 w-4 text-primary" />
                            )}
                            {pattern.category === "Emotions" && (
                              <Heart className="h-4 w-4 text-primary" />
                            )}
                            {pattern.category === "Growth" && (
                              <TrendingUp className="h-4 w-4 text-primary" />
                            )}
                            {pattern.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            {pattern.insights.map((insight, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <Badge
                                  className={getBadgeColorsByType(insight.type)}
                                  variant="secondary"
                                >
                                  {insight.type.charAt(0).toUpperCase() +
                                    insight.type.slice(1)}
                                </Badge>
                                <p className="text-muted-foreground flex-1">
                                  {insight.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {insightsQuery.data?.recommendations && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {insightsQuery.data.recommendations.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid gap-4">
                          {insightsQuery.data.recommendations.items.map(
                            (item, index) => (
                              <div key={index} className="space-y-1.5">
                                <h4 className="font-medium text-sm">
                                  {item.focus}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {item.suggestion}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowInsights(false)}>
              Close
            </Button>
            <Button
              variant="default"
              onClick={() => insightsQuery.refetch()}
              disabled={insightsQuery.isFetching}
            >
              {insightsQuery.isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Insights
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
