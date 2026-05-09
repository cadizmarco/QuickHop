import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, UserRole } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TrackOrder from "./pages/TrackOrder";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import BusinessDashboard from "./pages/BusinessDashboard";
import RiderDashboard from "./pages/RiderDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  customer: '/customer',
  business: '/business',
  rider: '/rider',
};

const FullPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole?: UserRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Wait for auth/profile to settle on first load so a valid session is
  // not prematurely redirected to /login on refresh.
  if (loading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    // Remember where the user was trying to go so we can send them back
    // after a successful login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged in but wrong role -> send them to their own dashboard
  // instead of bouncing to /login (which caused a loop-like UX).
  if (allowedRole && user && user.role !== allowedRole) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup/rider" element={<Signup role="rider" />} />
            <Route path="/signup/business" element={<Signup role="business" />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedRoute allowedRole="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business"
              element={
                <ProtectedRoute allowedRole="business">
                  <BusinessDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider"
              element={
                <ProtectedRoute allowedRole="rider">
                  <RiderDashboard />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
