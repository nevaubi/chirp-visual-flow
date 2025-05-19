
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import BookmarksCallback from "./pages/BookmarksCallback";
import NewUserDirect from "./pages/NewUserDirect";
import FreeTools from "./pages/FreeTools";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/Home";
import CreateNewsletter from "./pages/dashboard/CreateNewsletter";
import { AuthProvider } from "./contexts/AuthContext";

// Create placeholder components for other dashboard pages
const Analytics = () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold">Analytics</h1>
    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Analytics dashboard content will appear here</p>
    </div>
  </div>
);

const Community = () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold">Community</h1>
    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Community management features will appear here</p>
    </div>
  </div>
);

const Settings = () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold">Settings</h1>
    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Settings configuration will appear here</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/bookmarks/callback" element={<BookmarksCallback />} />
            <Route path="/newuser-direct" element={<NewUserDirect />} />
            <Route path="/free-tools" element={<FreeTools />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard/home" replace />} />
                <Route path="home" element={<DashboardHome />} />
                <Route path="newsletter/create" element={<CreateNewsletter />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="community" element={<Community />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
