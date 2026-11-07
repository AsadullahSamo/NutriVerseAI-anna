import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Sparkles, Refrigerator, Snowflake, Warehouse } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/queryClient"
import { toast } from "sonner"

const ZONES = [
  { key: "fridge", label: "Fridge", icon: Refrigerator },
  { key: "freezer", label: "Freezer", icon: Snowflake },
  { key: "pantry", label: "Pantry", icon: Warehouse }
]

const nameOf = i => i.name || i.itemName || "Item"

export default function KitchenStoragePage() {
  const [tips, setTips] = useState([])
  const [loadingTips, setLoadingTips] = useState(false)

  useEffect(() => {
    document.title = "Kitchen Storage | NutriVerseAI"
  }, [])

  const { data, isLoading } = useQuery({ queryKey: ["/api/kitchen-storage"] })

  const getTips = async () => {
    const all = ZONES.flatMap(z => data?.zones?.[z.key] ?? []).map(nameOf)
    setLoadingTips(true)
    try {
      const res = await apiRequest("POST", "/api/kitchen-storage/tips", { items: all })
      if (!res.ok) throw new Error((await res.json()).message || "Failed")
      setTips(await res.json())
    } catch (e) {
      toast.error("Could not get storage tips", { description: e.message })
    } finally {
      setLoadingTips(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Kitchen Storage</h1>
          <p className="text-muted-foreground">Where your pantry items live and what needs using soon</p>
        </div>
        <Button onClick={getTips} disabled={loadingTips || !data?.total}>
          {loadingTips ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          AI Storage Tips
        </Button>
      </div>

      {data?.expiring?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Use soon</CardTitle>
            <CardDescription>Expiring within 7 days</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.expiring.map(i => (
              <Badge key={i.id} variant={i.daysLeft < 0 ? "destructive" : "secondary"}>
                {nameOf(i)} · {i.daysLeft < 0 ? "expired" : `${i.daysLeft}d`}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {ZONES.map(({ key, label, icon: Icon }) => {
          const items = data?.zones?.[key] ?? []
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{label}</CardTitle>
                <CardDescription>{items.length} item{items.length === 1 ? "" : "s"}</CardDescription>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing here. Add items on the Pantry page.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {items.map(i => (
                      <li key={i.id} className="flex justify-between gap-2">
                        <span>{nameOf(i)}</span>
                        <span className="text-muted-foreground">{i.quantity} {i.unit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {tips.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Storage tips</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tips.map((t, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold">{t.item}</span>{" "}
                <Badge variant="outline">{t.where}</Badge>{" "}
                <span className="text-muted-foreground">{t.shelfLife}</span>
                <p>{t.tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
