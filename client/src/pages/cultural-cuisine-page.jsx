import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, AlertCircle } from "lucide-react"
import { CuisineList } from "@/components/CulturalCuisine/CuisineList"
import { CuisineDetails } from "@/components/CulturalCuisine/CuisineDetails"
import { Button } from "@/components/ui/button"

export default function CulturalCuisinePage() {
  const [selectedCuisineId, setSelectedCuisineId] = useState(null)
  const [view, setView] = useState("list")
  const [viewFilter, setViewFilter] = useState("all") // "all" or "my"
  const [errorDetails, setErrorDetails] = useState(null)
  const [forceRefresh, setForceRefresh] = useState(Date.now())
  const queryClient = useQueryClient()

  useEffect(() => {
    document.title = "Cultural Cuisine Explorer | NutriVerseAI"
  }, [])

  const { data: cuisines, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/cultural-cuisines", forceRefresh],
    queryFn: async () => {
      try {
        // Add timestamp to prevent caching
        const timestamp = Date.now()
        console.log("Fetching cuisines with timestamp:", timestamp)
        
        // Import config to get the base URL
        const config = (await import("@/lib/config")).default
        const apiUrl = `${config.apiBaseUrl}/api/cultural-cuisines?t=${timestamp}`
        console.log("Requesting from URL:", apiUrl)
        
        const response = await fetch(apiUrl, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        })

        console.log("Response status:", response.status)
        console.log("Response headers:", Object.fromEntries([...response.headers.entries()]))
        
        if (!response.ok) {
          try {
            const errorData = await response.json()
            console.error("API error response:", errorData)
            throw new Error(
              errorData.details || errorData.error || "Failed to fetch cuisines"
            )
          } catch (jsonError) {
            // Handle non-JSON responses
            console.error("Failed to parse error as JSON:", jsonError)
            const text = await response.text().catch(() => "Unknown error")
            console.error("Raw error response:", text.substring(0, 200))
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }
        }

        // Check content type to ensure we're getting JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text().catch(() => "Unknown format")
          const preview = text.substring(0, 50) + (text.length > 50 ? "..." : "")
          throw new Error(`Server returned non-JSON response: ${preview}`)
        }

        const data = await response.json()
        if (!Array.isArray(data)) {
          throw new Error("Invalid response format")
        }

        return data
      } catch (err) {
        if (err instanceof Error) {
          setErrorDetails(err.message)
        }
        throw err
      }
    },
    staleTime: 0,
    cacheTime: 0
  })

  const handleSelectCuisine = id => {
    setSelectedCuisineId(id)
    setView("details")
  }

  const handleBackToList = () => {
    setSelectedCuisineId(null)
    setView("list")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-2xl font-bold mb-2">Failed to load cuisines</h3>
        <p className="text-muted-foreground max-w-md mb-2">
          There was an error loading the cultural cuisines. Please try again
          later.
        </p>
        {errorDetails && (
          <p className="text-sm text-destructive mb-4">
            Error details: {errorDetails}
          </p>
        )}
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Refresh Page
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12 overflow-x-hidden">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Cultural Cuisine Explorer</h1>
            <p className="text-muted-foreground">
              Discover authentic recipes from around the world
            </p>
          </div>

          {view === "details" && (
            <Button onClick={handleBackToList} variant="outline">
              Back to All Cuisines
            </Button>
          )}
        </div>

        {view === "list" && (
          <>
            {/* View Filter */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={viewFilter === "all" ? "default" : "outline"}
                onClick={() => setViewFilter("all")}
                size="sm"
              >
                All Cuisines
              </Button>
              <Button
                variant={viewFilter === "my" ? "default" : "outline"}
                onClick={() => setViewFilter("my")}
                size="sm"
              >
                My Cuisines
              </Button>
            </div>

            <CuisineList
              cuisines={cuisines || []}
              onSelectCuisine={handleSelectCuisine}
              viewFilter={viewFilter}
            />
          </>
        )}

        {view === "details" && selectedCuisineId && (
          <CuisineDetails
            cuisineId={selectedCuisineId}
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  )
}
