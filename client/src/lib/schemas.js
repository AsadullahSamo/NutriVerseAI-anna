import { z } from "zod"

// Client-side user schema for authentication
export const insertUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username cannot exceed 30 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password cannot exceed 100 characters"),
  preferences: z.object({}).optional()
})

// Forgot password schema
export const forgotPasswordSchema = z.object({
  username: z.string().min(1, "Username is required"),
  secretKey: z.string().min(1, "Secret key is required"),
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password cannot exceed 100 characters")
})
