import { toast as sonnerToast } from "sonner"

// Production-safe toast implementation using Sonner
export function toast({ title, description, variant = "default", ...props }) {
  // Ensure title and description are strings to prevent React error #31
  const safeTitle = typeof title === 'string' ? title : String(title || '')
  const safeDescription = typeof description === 'string' ? description : String(description || '')

  // Handle different variants
  if (variant === "destructive") {
    sonnerToast.error(safeTitle || safeDescription, {
      description: safeTitle ? safeDescription : undefined,
      ...props
    })
  } else if (variant === "success") {
    sonnerToast.success(safeTitle || safeDescription, {
      description: safeTitle ? safeDescription : undefined,
      ...props
    })
  } else {
    sonnerToast(safeTitle || safeDescription, {
      description: safeTitle ? safeDescription : undefined,
      ...props
    })
  }

  return {
    id: Date.now().toString(),
    dismiss: () => sonnerToast.dismiss(),
    update: () => {} // No-op for compatibility
  }
}

// Production-safe useToast hook
export function useToast() {
  return {
    toast,
    dismiss: () => sonnerToast.dismiss(),
    toasts: [] // Empty array for compatibility
  }
}
