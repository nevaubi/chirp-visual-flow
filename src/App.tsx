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
import TickerDrop from "./pages/TickerDrop";
import TickerDropVerify from "./pages/TickerDropVerify";
import TickerDropUnsubscribe from "./pages/TickerDropUnsubscribe";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/dashboard/Home";
import CheckoutSuccess from "./pages/dashboard/CheckoutSuccess";
import CheckoutCancel from "./pages/dashboard/CheckoutCancel";
import { AuthProvider } from "./contexts/AuthContext";
import Settings from "./pages/dashboard/Settings";
import Library from "./pages/dashboard/Library";
import ChainOfThought from "./pages/ChainOfThought";

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
            <Route path="/ticker-drop" element={<TickerDrop />} />
            <Route path="/chain-of-thought" element={<ChainOfThought />} />
            <Route path="/ticker-drop/verify" element={<TickerDropVerify />} />
            <Route path="/ticker-drop/unsubscribe" element={<TickerDropUnsubscribe />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            
            {/* New routes for individual tools */}
            <Route path="/tools/tweet-id-converter" element={<TweetIdConverter />} />
            <Route path="/tools/tweet-screenshot" element={<TweetScreenshot />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard/home" replace />} />
                <Route path="home" element={<DashboardHome />} />
                <Route path="checkout-success" element={<CheckoutSuccess />} />
                <Route path="checkout-cancel" element={<CheckoutCancel />} />
                <Route path="analytics" element={<Library />} />
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
