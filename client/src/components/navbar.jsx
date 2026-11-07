import React from "react"
import { Link } from "wouter"
import { UserDropdown } from "./UserDropdown.jsx"
import { UserDropdownBasic } from "./UserDropdownBasic.jsx"
import { UserDropdownFinal } from "./UserDropdownFinal.jsx"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Home,
  Book,
  ShoppingCart,
  Users,
  Calendar,
  LineChart,
  Wrench,
  Globe,
  Menu,
  X,
  ChevronDown,
  UtensilsCrossed,
  ChefHat,
  Clock,
  MessageSquare,
  Refrigerator
} from "lucide-react"


export function Navbar() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeDropdown, setActiveDropdown] = React.useState(null)

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.relative.group')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown])

  const mainLinks = [
    { href: "/", icon: Home, label: "Home" }
  ]

  const menuGroups = {
    food: {
      label: "Food",
      icon: UtensilsCrossed,
      items: [
        { href: "/recipes", icon: Book, label: "Recipes" },
        { href: "/cultural-cuisine", icon: Globe, label: "Cultural Cuisine" },
        { href: "/community", icon: MessageSquare, label: "Community" }
      ]
    },
    kitchen: {
      label: "Kitchen",
      icon: ChefHat,
      items: [
        { href: "/pantry", icon: ShoppingCart, label: "Pantry" },
        { href: "/kitchen-storage", icon: Refrigerator, label: "Kitchen Storage" },
        {
          href: "/kitchen-equipment",
          icon: Wrench,
          label: "Equipment Management"
        }
      ]
    },
    planning: {
      label: "Planning",
      icon: Clock,
      items: [
        { href: "/meal-plans", icon: Calendar, label: "Meal Plans" },
        { href: "/nutrition", icon: LineChart, label: "Nutrition Tracking" }
      ]
    }
  }

  return (
    <>
      <header className="app-header fixed top-0 left-0 right-0 z-50 border-b bg-background">
        <div className="container flex h-14 items-center">
          {/* Logo - aligned to the left with proper spacing */}
          <Link href="/" className="flex items-center min-h-[44px] md:pl-4">
            <span className="font-bold text-xl">NutriVerseAI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex justify-center items-center space-x-6 mx-auto">
            {/* Main Links */}
            {mainLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Hybrid Hover/Click Dropdown Menus */}
            {Object.entries(menuGroups).map(([key, group]) => (
              <div key={key} className="relative group">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-3 py-2"
                  onClick={(e) => {
                    // Toggle dropdown on click for mobile/touch devices
                    if (activeDropdown === key) {
                      setActiveDropdown(null);
                    } else {
                      setActiveDropdown(key);
                    }

                    // Fallback: double click navigates to first item
                    if (e.detail === 2) {
                      window.location.hash = "#" + group.items[0].href;
                    }
                  }}
                  title={`${group.label} - Click to toggle menu, double click to go to ${group.items[0].label}`}
                >
                  <group.icon className="h-4 w-4" />
                  <span>{group.label}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === key ? 'rotate-180' : ''}`} />
                </Button>

                {/* Hybrid dropdown menu - shows on hover OR click */}
                <div className={`absolute left-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg transition-all duration-200 z-50 ${
                  activeDropdown === key
                    ? 'opacity-100 visible'
                    : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                }`}>
                  <div className="py-1">
                    {group.items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          {/* Right side controls with proper spacing */}
          <div className="flex items-center gap-2 md:gap-4 ml-auto md:pr-4">
            {/* Mobile menu button - moved before other controls */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md p-0"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="sr-only">Open menu</span>
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            <UserDropdownFinal />
          </div>
        </div>

        {/* Mobile Navigation Menu with enhanced spacing */}
        {isOpen && (
          <>
            <div
              className="app-mobile-menu-backdrop fixed inset-0 z-40 bg-background/95 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <div className="app-mobile-menu fixed inset-x-0 z-50 border-t bg-background shadow-lg overflow-y-auto">
              <nav className="container flex flex-col divide-y divide-border">
                {/* Main Links */}
                {mainLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="h-12 w-[100%] flex items-center gap-3 px-6 py-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setIsOpen(false)}
                  >
                    <link.icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </Link>
                ))}

                {/* Group Links */}
                {Object.values(menuGroups).flatMap(group =>
                  group.items.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="h-12 w-[100%] flex items-center gap-3 px-6 py-4 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))
                )}
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  )
} 