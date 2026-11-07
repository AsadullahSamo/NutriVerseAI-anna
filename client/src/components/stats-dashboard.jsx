import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartJSPieChart as PieChart, ChartJSLineChart as LineChart } from "@/components/ui/chartjs-chart"
import { format, subDays } from "date-fns"
import { Package, Leaf, AlertTriangle, Apple, Search, Filter } from "lucide-react"

export function StatsDashboard({ pantryItems, filteredItems, searchTerm, selectedCategory }) {
  // Use filtered items if provided, otherwise use all pantry items
  const itemsToAnalyze = filteredItems || pantryItems

  // Calculate category distribution
  const categoryData = itemsToAnalyze.reduce((acc, item) => {
    const category = item.category || "Uncategorized"
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  // Calculate average sustainability score
  const avgSustainability =
    itemsToAnalyze.reduce(
      (sum, item) => sum + (item.sustainabilityInfo?.score || 0),
      0
    ) / (itemsToAnalyze.length || 1)

  // Calculate expiring items timeline (next 30 days)
  const today = new Date()
  const timelineData = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(today, i), "MMM d")
    const count = itemsToAnalyze.filter(
      item =>
        item.expiryDate && format(new Date(item.expiryDate), "MMM d") === date
    ).length
    return { date, count }
  }).reverse()

  // Calculate total nutrition values
  const totalNutrition = itemsToAnalyze.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.nutritionInfo?.calories || 0),
      protein: acc.protein + (item.nutritionInfo?.protein || 0),
      carbs: acc.carbs + (item.nutritionInfo?.carbs || 0),
      fat: acc.fat + (item.nutritionInfo?.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Determine analysis mode
  const analysisMode = searchTerm 
    ? "Search Results" 
    : selectedCategory !== "all" 
      ? `${selectedCategory} Category` 
      : "Overall Analysis"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {searchTerm ? (
          <>
            <Search className="h-4 w-4" />
            <span>Showing results for "{searchTerm}"</span>
          </>
        ) : selectedCategory !== "all" ? (
          <>
            <Filter className="h-4 w-4" />
            <span>Showing {selectedCategory} category</span>
          </>
        ) : (
          <>
            <Package className="h-4 w-4" />
            <span>Showing all items</span>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsToAnalyze.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(categoryData).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sustainability Score
            </CardTitle>
            <Leaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgSustainability.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average score out of 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                itemsToAnalyze.filter(item => {
                  if (!item.expiryDate) return false
                  const days = Math.floor(
                    (new Date(item.expiryDate).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                  return days <= 7
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Items expiring within 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nutrition</CardTitle>
            <Apple className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalNutrition.calories.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total calories in {analysisMode.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart
              data={Object.entries(categoryData).map(([name, value]) => ({
                name,
                value
              }))}
            />
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Expiry Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={timelineData}
              categories={["count"]}
              index="date"
              colors={["#f97316"]}
              valueFormatter={value => String(value)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
