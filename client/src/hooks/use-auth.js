import React, { createContext, useContext, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { toast } from "sonner"

// Anna signs the person in, so there is always exactly one user. The mutation
// objects stay so existing components keep working; sign-in style ones do nothing.

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [error, setError] = useState(null)
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const response = await fetch("/api/user")
      if (!response.ok) return null
      return response.json()
    },
    staleTime: Infinity
  })

  const noop = () =>
    useMutation({
      mutationFn: async () => ({}),
      onSuccess: () => setError(null)
    })

  const loginMutation = noop()
  const registerMutation = noop()
  const logoutMutation = noop()
  const forgotPasswordMutation = noop()
  const changePasswordMutation = noop()

  const updateProfileMutation = useMutation({
    mutationFn: async profileData => {
      const response = await apiRequest("PATCH", "/api/account/profile", profileData)
      return response.json()
    },
    onSuccess: data => {
      setError(null)
      queryClient.setQueryData(["/api/user"], data)
      queryClient.invalidateQueries({ queryKey: ["userProfile"] })
    },
    onError: err => {
      setError(err.message)
      toast.error("Could not update profile: " + (err.message || "Unknown error"))
    }
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/account")
      return response.json()
    },
    onSuccess: () => {
      setError(null)
      queryClient.clear()
      localStorage.removeItem("userPreferences")
      window.location.hash = "#/"
      window.location.reload()
    },
    onError: err => {
      setError(err.message)
      toast.error("Could not delete your data: " + (err.message || "Unknown error"))
    }
  })

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user: user ?? null,
        isAuthenticated: !!user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        changePasswordMutation,
        forgotPasswordMutation,
        deleteAccountMutation
      }
    },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
