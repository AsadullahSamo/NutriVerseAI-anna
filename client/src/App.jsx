import { Router as WouterRouter, Switch, Route } from "wouter"
import { useHashLocation } from "wouter/use-hash-location"
import { queryClient } from "@/lib/queryClient"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { AuthProvider } from "@/hooks/use-auth"
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext"
import ErrorBoundary from "@/components/ErrorBoundary"
// Import custom toast styles
import "@/styles/toast.css"
import NotFound from "@/pages/not-found"
import HomePage from "@/pages/home-page"
import RecipesPage from "@/pages/recipes-page"
import PantryPage from "@/pages/pantry-page"
import MealPlanPage from "@/pages/meal-plan-page"
import { ProtectedRoute } from "@/lib/protected-route"
import { Navbar } from "@/components/navbar"
import NutritionPage from "./pages/nutrition-page"
import KitchenEquipmentPage from "@/pages/kitchen-equipment-page"
import CulturalCuisinePage from "@/pages/cultural-cuisine-page"
import ProfilePage from "@/pages/profile-page"
import UserSettings from "@/pages/user-settings"
import CommunityPage from "@/pages/community-page"
import KitchenStoragePage from "@/pages/kitchen-storage-page"


function Router() {
  return (
    <>
      <Switch>
        <Route path="*">
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="app-main flex-1">
              <Switch>
                <ProtectedRoute path="/" component={HomePage} />
                <ProtectedRoute path="/recipes" component={RecipesPage} />
                <ProtectedRoute path="/pantry" component={PantryPage} />
                <ProtectedRoute path="/meal-plans" component={MealPlanPage} />
                <ProtectedRoute path="/nutrition" component={NutritionPage} />
                <ProtectedRoute
                  path="/kitchen-equipment"
                  component={KitchenEquipmentPage}
                />
                <ProtectedRoute
                  path="/cultural-cuisine"
                  component={CulturalCuisinePage}
                />
                <ProtectedRoute path="/community" component={CommunityPage} />
                <ProtectedRoute path="/kitchen-storage" component={KitchenStoragePage} />
                <ProtectedRoute path="/profile" component={ProfilePage} />
                <ProtectedRoute path="/settings" component={UserSettings} />

                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </Route>
      </Switch>
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserPreferencesProvider>
            <WouterRouter hook={useHashLocation}>
              <Router />
            </WouterRouter>
            <Toaster
              position="top-right"
              richColors={true}
              closeButton={false}
              duration={3000}
              expand={false}
              visibleToasts={3}
              theme="system"
              toastOptions={{
                style: {
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  padding: '12px 16px',
                },
                className: 'custom-toast',
              }}
            />
          </UserPreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
