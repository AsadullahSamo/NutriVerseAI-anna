import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useQuery, useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { CustomSelect, CustomSelectItem } from "@/components/ui/custom-select"
import { Switch } from "@/components/ui/switch"
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
import { Loader2 } from "lucide-react"
import { useLocation } from "wouter"

export default function UserSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const [isDeleting, setIsDeleting] = useState(false)

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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/account")
    },
    onSuccess: () => {
      setLocation("/auth")
      toast({
        description: "Account deleted successfully"
      })
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to delete account"
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

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAccountMutation.mutateAsync()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={user?.username} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <CustomSelect
                value={profile.preferences?.language || "en"}
                onValueChange={value =>
                  updateProfileMutation.mutate({
                    preferences: { ...profile.preferences, language: value }
                  })
                }
                placeholder="Select language"
              >
                <CustomSelectItem value="en">English</CustomSelectItem>
                <CustomSelectItem value="es">Spanish</CustomSelectItem>
                <CustomSelectItem value="fr">French</CustomSelectItem>
              </CustomSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                defaultValue={profile.preferences?.region || ""}
                onChange={e =>
                  updateProfileMutation.mutate({
                    preferences: {
                      ...profile.preferences,
                      region: e.target.value
                    }
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch
                id="notifications"
                checked={profile.preferences?.notifications}
                onCheckedChange={checked =>
                  updateProfileMutation.mutate({
                    preferences: {
                      ...profile.preferences,
                      notifications: checked
                    }
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
