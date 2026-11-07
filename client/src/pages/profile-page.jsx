import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { useUserPreferences } from "@/contexts/UserPreferencesContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Switch } from "@/components/ui/switch"
import { Loader2, Save } from "lucide-react"

// Helper function to get initials
const getInitials = name => {
  if (!name) return ""
  return name
    .split(" ")
    .map(n => n?.[0] || "")
    .join("")
    .toUpperCase()
}

export default function ProfilePage() {
  const {
    user,
    updateProfileMutation,
    changePasswordMutation,
    logoutMutation,
    deleteAccountMutation
  } = useAuth()

  // Debug user object
  console.log("Profile page - user object:", user)
  const {
    preferences,
    updateAccentColor,
    updatePreference
  } = useUserPreferences()

  // Profile state with localStorage persistence
  const [profileForm, setProfileForm] = useState(() => {
    const savedProfile = localStorage.getItem("userProfile")
    const defaultProfile = {
      name: user?.name || "",
      profilePicture: user?.profilePicture || ""
    }
    return savedProfile ? JSON.parse(savedProfile) : defaultProfile
  })

  // Force re-render for avatar updates
  const [avatarKey, setAvatarKey] = useState(0)

  // Sync profileForm with user data when it changes
  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: user.name || prev.name,
        profilePicture: user.profilePicture || prev.profilePicture
      }))
    }
  }, [user])

  // User preferences state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  // Delete account state
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("")

  // Save profile to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profileForm))
  }, [profileForm])

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences))
    // Apply theme
    document.documentElement.classList.remove("light", "dark")
    if (preferences.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      document.documentElement.classList.add(systemTheme)
    } else {
      document.documentElement.classList.add(preferences.theme)
    }
    // Apply accent color
    document.documentElement.style.setProperty(
      "--accent-color",
      preferences.accentColor
    )
  }, [preferences])

  // Handle preferences change
  const handlePreferencesChange = (key, value) => {
    // Special case for accent color - use the optimized function
    if (key === "accentColor") {
      updateAccentColor(value)
    } else {
      updatePreference(key, value)
    }
  }

  // Handle profile form changes
  const handleProfileChange = e => {
    const { name, value } = e.target
    setProfileForm(prev => {
      // If profile picture is being changed/cleared, force avatar to update
      if (name === "profilePicture" && prev.profilePicture !== value) {
        // Small delay to ensure state updates properly
        setTimeout(() => setAvatarKey(prevKey => prevKey + 1), 0)
      }
      return { ...prev, [name]: value }
    })
  }

  // Handle password form changes
  const handlePasswordChange = e => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  // Handle profile update
  const handleUpdateProfile = async e => {
    e.preventDefault()
    try {
      await updateProfileMutation.mutate({
        name: profileForm.name,
        profilePicture: profileForm.profilePicture
      })

      // Update localStorage and dispatch update event
      localStorage.setItem("userProfile", JSON.stringify(profileForm))

      // Force avatar re-render
      setAvatarKey(prevKey => prevKey + 1)

      // Dispatch custom event for immediate updates
      window.dispatchEvent(new Event("localProfileUpdate"))

      toast.success("Profile Updated", {
        description: "Your profile information has been updated successfully."
      })
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Update Failed", {
        description: error.message || "Failed to update profile information."
      })
    }
  }

  // Handle password change
  const handleChangePassword = async e => {
    e.preventDefault()

    // Reset previous errors
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    })

    // Validate empty fields
    let hasError = false
    if (!passwordForm.currentPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        currentPassword: "Current password is required"
      }))
      hasError = true
    }
    if (!passwordForm.newPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        newPassword: "New password is required"
      }))
      hasError = true
    }
    if (!passwordForm.confirmPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        confirmPassword: "Please confirm your new password"
      }))
      hasError = true
    }

    if (hasError) return

    // Password length validation
    if (passwordForm.newPassword.length < 6) {
      setPasswordErrors(prev => ({
        ...prev,
        newPassword: "New password must be at least 6 characters long"
      }))
      return
    }

    // Validate password match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        confirmPassword: "Passwords do not match"
      }))
      return
    }

    // Validate new password is different from current
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordErrors(prev => ({
        ...prev,
        newPassword: "New password must be different from current password"
      }))
      return
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      toast.success("Success", {
        description: "Your password has been changed successfully"
      })

      // Reset password form and errors
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setPasswordErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
    } catch (error) {
      if (error.message === "Current password is incorrect") {
        setPasswordErrors(prev => ({
          ...prev,
          currentPassword: "Current password is incorrect"
        }))
      } else {
        toast.error("Error", {
          description:
            error.message || "Failed to change password. Please try again."
        })
      }
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!deleteAccountPassword) {
      toast.error("Error", {
        description: "Please enter your password to confirm account deletion"
      })
      return
    }

    try {
      await deleteAccountMutation.mutateAsync({ password: deleteAccountPassword })
      
      // Show success message
      toast.success("Account Deleted", {
        description: "Your account has been deleted successfully."
      })
    } catch (error) {
      console.error("Delete account error:", error)
      // Error is handled by the mutation
    }
  }

  // If user is not loaded yet, show loading state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Account Management</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex flex-col items-center gap-2">
                  <Avatar
                    className="h-24 w-24"
                    key={`avatar-${avatarKey}-${!!profileForm.profilePicture}`}
                  >
                    {profileForm.profilePicture ? (
                      <AvatarImage
                        src={profileForm.profilePicture}
                        alt={user.username}
                      />
                    ) : (
                      <AvatarFallback
                        className="text-xl bg-primary text-primary-foreground"
                        style={{ backgroundColor: preferences.accentColor }}
                      >
                        {getInitials(profileForm.name || user.username)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>

                <form
                  onSubmit={handleUpdateProfile}
                  className="flex-1 space-y-4"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={user.username || user.name || user.email?.split('@')[0] || ''}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="profilePicture">
                        Profile Picture URL
                      </Label>
                      <Input
                        id="profilePicture"
                        name="profilePicture"
                        value={profileForm.profilePicture || ""}
                        onChange={handleProfileChange}
                        placeholder="https://example.com/your-profile-picture.jpg"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="flex gap-2"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="space-y-4">
                  {/* Color presets */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      "#0ea5e9",
                      "#10b981",
                      "#f59e0b",
                      "#ef4444",
                      "#8b5cf6",
                      "#ec4899", // Row 1
                      "#06b6d4",
                      "#059669",
                      "#ca8a04",
                      "#dc2626",
                      "#7c3aed",
                      "#be185d", // Row 2
                      "#0284c7",
                      "#047857",
                      "#b45309",
                      "#991b1b",
                      "#6d28d9",
                      "#9d174d" // Row 3
                    ].map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full transition-all ${
                          preferences.accentColor === color
                            ? "ring-2 ring-offset-2 ring-black dark:ring-white scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          handlePreferencesChange("accentColor", color)
                        }
                      />
                    ))}
                  </div>

                  {/* Custom color picker */}
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={preferences.accentColor}
                      onChange={e =>
                        handlePreferencesChange("accentColor", e.target.value)
                      }
                      className="h-10 w-20 rounded-md cursor-pointer"
                    />
                    <Input
                      value={preferences.accentColor}
                      onChange={e =>
                        handlePreferencesChange("accentColor", e.target.value)
                      }
                      placeholder="#000000"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={preferences.region}
                  onChange={e =>
                    handlePreferencesChange("region", e.target.value)
                  }
                  placeholder="Enter your region"
                />
              </div>

              {/* <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates and important notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications}
                  onCheckedChange={checked =>
                    handlePreferencesChange("notifications", checked)
                  }
                />
              </div> */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your current password"
                      className={
                        passwordErrors.currentPassword
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-sm font-medium text-destructive">
                        {passwordErrors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your new password"
                      className={
                        passwordErrors.newPassword ? "border-destructive" : ""
                      }
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-sm font-medium text-destructive">
                        {passwordErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm your new password"
                      className={
                        passwordErrors.confirmPassword
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm font-medium text-destructive">
                        {passwordErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>

              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleteAccountMutation.isPending}>
                      {deleteAccountMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and all associated data. Please enter your password to confirm.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="deleteAccountPassword">Password</Label>
                      <Input
                        id="deleteAccountPassword"
                        type="password"
                        value={deleteAccountPassword}
                        onChange={(e) => setDeleteAccountPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="mt-2"
                        disabled={deleteAccountMutation.isPending}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteAccountMutation.isPending}
                      >
                        {deleteAccountMutation.isPending ? (
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
