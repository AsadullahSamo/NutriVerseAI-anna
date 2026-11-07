import { useAuth } from "@/hooks/use-auth"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChromePicker } from "react-color"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [showColorPicker, setShowColorPicker] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/profile")
      return response.json()
    }
  })

  const updateProfileMutation = useMutation({
    mutationFn: async data => {
      const response = await apiRequest("PATCH", "/api/user/profile", data)
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] })
      toast({
        description: "Profile updated successfully"
      })
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update profile"
      })
    }
  })

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const displayName = profile.name || profile.username
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
  const backgroundColor = profile.preferences?.accentColor || "#0ea5e9"

  return (
    <div className="container py-8 max-w-2xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={displayName} />
              ) : (
                <AvatarFallback
                  style={{
                    backgroundColor,
                    color: "#fff"
                  }}
                  className="text-2xl font-medium"
                >
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {profile.email && (
                <p className="text-muted-foreground">{profile.email}</p>
              )}
            </div>

            <div className="space-y-2 w-full">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                defaultValue={profile.avatarUrl || ""}
                onChange={e =>
                  updateProfileMutation.mutate({ avatarUrl: e.target.value })
                }
                placeholder="Enter image URL for avatar"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                defaultValue={profile.name || ""}
                onChange={e =>
                  updateProfileMutation.mutate({ name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={profile.email || ""}
                onChange={e =>
                  updateProfileMutation.mutate({ email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Avatar Color</Label>
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded cursor-pointer border"
                  style={{ backgroundColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="absolute mt-2 z-10">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowColorPicker(false)}
                    />
                    <ChromePicker
                      color={backgroundColor}
                      onChange={color => {
                        updateProfileMutation.mutate({
                          preferences: {
                            ...profile.preferences,
                            accentColor: color.hex
                          }
                        })
                      }}
                    />
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  {showColorPicker ? "Close" : "Change Color"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
