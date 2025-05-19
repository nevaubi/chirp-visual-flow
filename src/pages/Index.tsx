
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authState, checkSubscription } = useAuth();
  const isAuthenticated = !!authState.user;
  
  useEffect(() => {
    // Check for checkout success/cancel parameters
    const checkoutSuccess = searchParams.get("checkoutSuccess");
    const checkoutCanceled = searchParams.get("checkoutCanceled");
    
    if (checkoutSuccess === "true" && isAuthenticated) {
      // If checkout was successful, refresh subscription status
      checkSubscription().then(() => {
        toast.success("Subscription activated!", {
          description: "Thank you for your subscription. Your account has been upgraded."
        });
        
        // Navigate without the query parameters
        navigate("/", { replace: true });
      });
    } else if (checkoutCanceled === "true") {
      toast.info("Checkout cancelled", {
        description: "Your subscription checkout was cancelled. No charges were made."
      });
      
      // Navigate without the query parameters
      navigate("/", { replace: true });
    }
  }, [searchParams, isAuthenticated, checkSubscription, navigate]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
