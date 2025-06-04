
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';

// Pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import BookmarksCallback from '@/pages/BookmarksCallback';
import NotFound from '@/pages/NotFound';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import FreeTools from '@/pages/FreeTools';
import TweetIdConverter from '@/pages/tools/TweetIdConverter';
import TweetScreenshot from '@/pages/tools/TweetScreenshot';
import NewUserDirect from '@/pages/NewUserDirect';
import ChainOfThought from '@/pages/ChainOfThought';
import SatoshiSummary from '@/pages/SatoshiSummary';
import TickerDrop from '@/pages/TickerDrop';
import TickerDropVerify from '@/pages/TickerDropVerify';
import TickerDropUnsubscribe from '@/pages/TickerDropUnsubscribe';

// Dashboard pages
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardHome from '@/pages/dashboard/Home';
import Library from '@/pages/dashboard/Library';
import CreateNewsletter from '@/pages/dashboard/CreateNewsletter';
import GenerateTweets from '@/pages/dashboard/GenerateTweets';
import Settings from '@/pages/dashboard/Settings';
import CheckoutSuccess from '@/pages/dashboard/CheckoutSuccess';
import CheckoutCancel from '@/pages/dashboard/CheckoutCancel';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/bookmarks/callback" element={<BookmarksCallback />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/new-user-direct" element={<NewUserDirect />} />
              <Route path="/chain-of-thought" element={<ChainOfThought />} />
              <Route path="/satoshi-summary" element={<SatoshiSummary />} />
              <Route path="/ticker-drop" element={<TickerDrop />} />
              <Route path="/ticker-drop/verify" element={<TickerDropVerify />} />
              <Route path="/ticker-drop/unsubscribe" element={<TickerDropUnsubscribe />} />
              <Route path="/free-tools" element={<FreeTools />} />
              <Route path="/tools/tweet-id-converter" element={<TweetIdConverter />} />
              <Route path="/tools/tweet-screenshot" element={<TweetScreenshot />} />
              
              {/* Protected dashboard routes */}
              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route path="" element={<DashboardLayout />}>
                  <Route path="home" element={<DashboardHome />} />
                  <Route path="analytics" element={<Library />} />
                  <Route path="community" element={<GenerateTweets />} />
                  <Route path="create-newsletter" element={<CreateNewsletter />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="checkout/success" element={<CheckoutSuccess />} />
                  <Route path="checkout/cancel" element={<CheckoutCancel />} />
                </Route>
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
