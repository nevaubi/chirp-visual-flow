
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();
  
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        setIsLoading(true);
        
        // Get the session ID from the URL
        const sessionId = searchParams.get("session_id");
        
        if (!sessionId) {
          toast.error("No session ID found in URL");
          navigate("/dashboard/home");
          return;
        }
        
        // Call the check-subscription function to update the subscription status
        const { error } = await supabase.functions.invoke("check-subscription");
        
        if (error) {
          console.error("Error checking subscription:", error);
          toast.error("Error checking subscription status");
        } else {
          toast.success("Subscription activated successfully!");
        }
      } catch (error) {
        console.error("Error in checkout success:", error);
        toast.error("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    // Only run if user is authenticated
    if (authState.user && !authState.loading) {
      checkSubscriptionStatus();
    }
  }, [authState.user, authState.loading, navigate, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        
        {isLoading ? (
          <p className="text-muted-foreground mb-6">
            We're activating your subscription...
          </p>
        ) : (
          <p className="text-muted-foreground mb-6">
            Your newsletter subscription has been activated. You can now start creating newsletters!
          </p>
        )}
        
        <div className="space-y-4">
          <Button 
            onClick={() => navigate("/dashboard/home")} 
            className="w-full bg-amber-500 hover:bg-amber-600"
          >
            Go to Dashboard
          </Button>
          
          <Button 
            onClick={() => navigate("/dashboard/newsletter/create")} 
            variant="outline" 
            className="w-full"
          >
            Create a Newsletter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
