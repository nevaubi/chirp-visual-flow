
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = () => {
  const { authState } = useAuth();
  const location = useLocation();

  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0087C8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading...</h2>
          <p className="text-gray-500 mt-2">Please wait while we check your authentication status.</p>
        </div>
      </div>
    );
  }

  if (!authState.user) {
    // Redirect to login page and save the location they were trying to access
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if this is a new user who should be in the onboarding flow
  if (authState.profile && authState.profile.is_new === null) {
    // Only redirect if they're not already on the newuser-direct page
    if (location.pathname !== '/newuser-direct') {
      return <Navigate to="/newuser-direct" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
