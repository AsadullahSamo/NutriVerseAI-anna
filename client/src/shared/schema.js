import { z } from "zod"

// Client-side schema definitions for form validation
// These are simplified versions of the server-side schemas

export const insertGroceryListSchema = z.object({
  userId: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  items: z.array(z.any()).default([]),
  completed: z.boolean().default(false),
  expiryDates: z.any().optional(),
  smartSubstitutions: z.any().optional()
})

export const insertPantryItemSchema = z.object({
  userId: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  category: z.string().min(1, "Category is required"),
  expiryDate: z.date().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  nutritionInfo: z.any().optional(),
  sustainabilityScore: z.number().min(0).max(100).optional()
})

export const insertRecipeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  ingredients: z.array(z.any()).min(1, "At least one ingredient is required"),
  instructions: z.array(z.string()).min(1, "At least one instruction is required"),
  nutritionInfo: z.any().optional(),
  imageUrl: z.string().optional(),
  prepTime: z.number().min(1, "Prep time is required"),
  createdBy: z.number().optional(),
  forkedFrom: z.number().optional(),
  sustainabilityScore: z.number().min(0).max(100).optional(),
  wastageReduction: z.any().optional()
})

export const insertMealPlanSchema = z.object({
  userId: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  startDate: z.date(),
  endDate: z.date(),
  meals: z.array(z.any()).default([]),
  preferences: z.any().optional(),
  nutritionGoals: z.any().optional()
})
