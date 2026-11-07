import { toast as sonnerToast } from "sonner"
import { X } from "lucide-react"

// Custom toast function that adds a proper close button
export function customToast(message, options = {}) {
  const { type = 'default', description, ...otherOptions } = options
  
  const toastContent = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ flex: 1, paddingRight: '8px' }}>
        <div style={{ fontWeight: '500', marginBottom: description ? '2px' : '0' }}>
          {message}
        </div>
        {description && (
          <div style={{ fontSize: '13px', opacity: '0.9' }}>
            {description}
          </div>
        )}
      </div>
      <button
        onClick={() => sonnerToast.dismiss()}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'hsl(var(--muted-foreground))',
          borderRadius: '4px',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: '0.7',
          transition: 'opacity 0.2s ease',
          padding: '0',
          margin: '0',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '1'
          e.target.style.background = 'hsl(var(--muted))'
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.7'
          e.target.style.background = 'transparent'
        }}
      >
        <X size={14} />
      </button>
    </div>
  )

  if (type === 'success') {
    return sonnerToast.success(toastContent, otherOptions)
  } else if (type === 'error') {
    return sonnerToast.error(toastContent, otherOptions)
  } else {
    return sonnerToast(toastContent, otherOptions)
  }
}

// Enhanced toast object with proper methods
export const toast = {
  success: (message, options = {}) => customToast(message, { ...options, type: 'success' }),
  error: (message, options = {}) => customToast(message, { ...options, type: 'error' }),
  info: (message, options = {}) => customToast(message, { ...options, type: 'default' }),
  default: (message, options = {}) => customToast(message, { ...options, type: 'default' }),
  dismiss: () => sonnerToast.dismiss(),
  // For backward compatibility with old format
  call: (message, options = {}) => customToast(message, options)
}

// Make it callable as a function too
toast.call = (message, options = {}) => customToast(message, options)
