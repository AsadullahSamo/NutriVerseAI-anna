import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export function CustomSelect({ value, onValueChange, placeholder, children, className = "", options = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState("")
  const selectRef = useRef(null)

  // Find the selected option's label
  useEffect(() => {
    if (value) {
      // Handle both children and options prop
      if (children) {
        const childOptions = React.Children.toArray(children)
        const selectedOption = childOptions.find(child => child.props.value === value)
        if (selectedOption) {
          setSelectedLabel(selectedOption.props.children)
        }
      } else if (options.length > 0) {
        const selectedOption = options.find(opt =>
          (typeof opt === 'string' ? opt : opt.value) === value
        )
        if (selectedOption) {
          setSelectedLabel(typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
        }
      }
    } else {
      setSelectedLabel("")
    }
  }, [value, children, options])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOptionClick = (optionValue, optionLabel) => {
    console.log('CustomSelect - Option selected:', optionValue)
    onValueChange(optionValue)
    setSelectedLabel(optionLabel)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {/* Trigger - Using navbar-consistent styling */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="navbar-dropdown-trigger"
      >
        <span className={selectedLabel ? "" : "text-muted-foreground"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown - Using navbar-consistent styling */}
      {isOpen && (
        <div className="navbar-dropdown-content">
          <div className="py-1">
            {/* Render from children prop */}
            {children && React.Children.map(children, (child) => (
              <button
                key={child.props.value}
                type="button"
                onClick={() => handleOptionClick(child.props.value, child.props.children)}
                className="navbar-dropdown-item"
              >
                {child.props.children}
              </button>
            ))}

            {/* Render from options prop */}
            {!children && options.map((option, index) => {
              const optionValue = typeof option === 'string' ? option : option.value
              const optionLabel = typeof option === 'string' ? option : option.label

              return (
                <button
                  key={`${optionValue}-${index}`}
                  type="button"
                  onClick={() => handleOptionClick(optionValue, optionLabel)}
                  className="navbar-dropdown-item"
                >
                  {optionLabel}
                </button>
              )
            })}

            {/* Show message if no options */}
            {!children && options.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CustomSelectItem({ value, children }) {
  // This is just a placeholder component for the children
  return null
}
