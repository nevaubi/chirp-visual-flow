
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
import TweetIdConverter from "./pages/tools/TweetIdConverter";
import TweetScreenshot from "./pages/tools/TweetScreenshot";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/Home";
import CheckoutSuccess from "./pages/dashboard/CheckoutSuccess";
import CheckoutCancel from "./pages/dashboard/CheckoutCancel";
import { AuthProvider } from "./contexts/AuthContext";
import Settings from "./pages/dashboard/Settings"; // Import the proper Settings component

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

// Remove the placeholder Settings component since we're importing the real one

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
            
            {/* New routes for individual tools */}
            <Route path="/tools/tweet-id-converter" element={<TweetIdConverter />} />
            <Route path="/tools/tweet-screenshot" element={<TweetScreenshot />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard/home" replace />} />
                <Route path="home" element={<DashboardHome />} />
                {/* The following route has been removed:
                <Route path="newsletter/create" element={<CreateNewsletter />} /> */}
                <Route path="checkout-success" element={<CheckoutSuccess />} />
                <Route path="checkout-cancel" element={<CheckoutCancel />} />
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
