// Force modal overlays to work in production
export function initModalFix() {
  if (typeof window === 'undefined') return;

  // Observer to watch for modal portals
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if this is a Radix portal
          if (node.hasAttribute && node.hasAttribute('data-radix-portal')) {
            fixModalOverlay(node);
          }
          
          // Check for nested portals
          const portals = node.querySelectorAll && node.querySelectorAll('[data-radix-portal]');
          if (portals) {
            portals.forEach(fixModalOverlay);
          }
        }
      });
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Fix existing portals
  setTimeout(() => {
    const existingPortals = document.querySelectorAll('[data-radix-portal]');
    existingPortals.forEach(fixModalOverlay);
  }, 100);
}

function fixModalOverlay(portal) {
  if (!portal) return;

  // Find overlay elements
  const overlays = portal.querySelectorAll('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
  
  overlays.forEach((overlay) => {
    // Force overlay styles
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '50';
    overlay.style.display = 'block';
  });

  // If no overlay found, create one
  if (overlays.length === 0) {
    const content = portal.querySelector('[data-radix-dialog-content], [data-radix-alert-dialog-content]');
    if (content) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 50;
        background-color: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(2px);
        display: block;
      `;
      overlay.setAttribute('data-forced-overlay', 'true');
      
      // Insert before content
      portal.insertBefore(overlay, content);
    }
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalFix);
  } else {
    initModalFix();
  }
}
