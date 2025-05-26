import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
  className?: string;
  buttonClassName?: string;
  platformIcon?: React.ReactNode;
  priceId: string;
  onPurchase: (priceId: string) => Promise<void>;
  isLoading?: boolean;
  isSubscribed?: boolean;
}

const PricingCard = ({
  title,
  price,
  description,
  features,
  ctaText,
  popular = false,
  className,
  buttonClassName,
  platformIcon,
  priceId,
  onPurchase,
  isLoading = false,
  isSubscribed = false,
}: PricingCardProps) => (
  <Card className={cn(
    "relative w-full max-w-[360px] mx-auto bg-white border border-black/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]",
    "rounded-2xl",
    isSubscribed && "border-green-500/50 bg-green-50/30",
    className
  )}>
    {popular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#0ea5e9] text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-[0_2px_6px_rgba(14,165,233,0.3)]">
        Most Popular
      </div>
    )}
    {isSubscribed && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 px-4 py-1.5 rounded-full text-sm font-semibold text-white">
        Your Plan
      </div>
    )}
    <CardHeader className="pt-8 pb-6 px-6">
      <div className="mb-5">
        {platformIcon}
      </div>
      <CardTitle className="text-[22px] font-bold text-[#1a365d] leading-tight mb-2">{title}</CardTitle>
      <div className="flex items-baseline gap-1 mt-4 mb-1">
        <span className="text-[42px] font-bold text-[#1a365d]">{price}</span>
        <span className="text-base text-[#64748b] font-medium">/month</span>
      </div>
      <CardDescription className="text-[#64748b] text-base leading-relaxed min-h-[80px]">{description}</CardDescription>
    </CardHeader>
    <CardContent className="px-6 pb-0">
      <ul className="space-y-4">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <Check className="h-5 w-5 shrink-0 text-[#0ea5e9]" />
            <span className="text-[#4a5568] text-[15px]">{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter className="px-6 pt-8 pb-8">
      {isSubscribed ? (
        <Button 
          className={cn("w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-md font-semibold text-base", buttonClassName)}
          onClick={() => handleManageSubscription()}
          disabled={isLoading}
        >
          Manage Subscription
        </Button>
      ) : (
        <Button 
          className={cn("w-full py-3.5 rounded-md font-semibold text-base transition-all duration-300", buttonClassName)}
          onClick={() => onPurchase(priceId)}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : ctaText}
        </Button>
      )}
    </CardFooter>
  </Card>
);

// Helper function to manage subscription
const handleManageSubscription = async () => {
  try {
    toast.loading("Opening customer portal...");
    const { data, error } = await supabase.functions.invoke("customer-portal");
    
    if (error) {
      toast.dismiss();
      toast.error("Could not open customer portal. Please try again.");
      console.error("Customer portal error:", error);
      return;
    }
    
    toast.dismiss();
    
    if (data?.url) {
      window.open(data.url, "_blank");
    } else {
      toast.error("No portal URL returned. Please try again.");
    }
  } catch (error) {
    toast.dismiss();
    console.error("Error opening customer portal:", error);
    toast.error("Something went wrong. Please try again.");
  }
};

const PricingSection = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [isLoadingNewsletter, setIsLoadingNewsletter] = useState(false);
  const [isLoadingCreator, setIsLoadingCreator] = useState(false);
  
  // Check if user is subscribed to either plan
  const isSubscribedToNewsletter = authState.profile?.subscription_tier === "Newsletter";
  const isSubscribedToCreator = authState.profile?.subscription_tier === "Creator";
  
  // Handle checkout process
  const handleCheckout = async (priceId: string, platform: 'newsletter' | 'creator') => {
    // Set the appropriate loading state
    if (platform === 'newsletter') {
      setIsLoadingNewsletter(true);
    } else {
      setIsLoadingCreator(true);
    }
    
    try {
      // Check if user is logged in
      if (!authState.user) {
        toast.error("Please log in to subscribe");
        navigate("/auth");
        return;
      }
      
      // Call the create-checkout edge function
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          priceId,
          platform
        }
      });
      
      if (error) {
        console.error("Checkout error:", error);
        toast.error("Could not initiate checkout. Please try again.");
        return;
      }
      
      if (data?.url) {
        // Redirect to Stripe checkout
        window.open(data.url, "_blank");
        toast("Checkout opened in a new tab", {
          description: "If the checkout window doesn't open, please check your popup blocker."
        });
      } else {
        toast.error("Invalid response from server. Please try again.");
      }
    } catch (error) {
      console.error("Error in checkout process:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      // Reset loading state
      if (platform === 'newsletter') {
        setIsLoadingNewsletter(false);
      } else {
        setIsLoadingCreator(false);
      }
    }
  };

  const newsletterCard = {
    title: "Auto Newsletter Platform",
    price: "$10",
    description: "Use your X (Twitter) bookmarks to auto generate professional newsletters of any topic",
    features: [
      "Auto newsletter generation",
      "Seamless X (Twitter) integration",
      "OneClick → professional newsletter",
      "Works with any niche or topic"
    ],
    ctaText: "Get Started",
    popular: true,
    buttonClassName: "bg-[#ff7720] hover:bg-[#e86612] text-white shadow-[0_2px_6px_rgba(255,119,32,0.3)]",
    platformIcon: (
      <div className="w-16 h-16 rounded-full bg-[#fff9f0] flex items-center justify-center">
        <Bookmark className="h-7 w-7 text-[#ff8536]" />
      </div>
    ),
    priceId: "price_1RQUm7DBIslKIY5sNlWTFrQH",
    onPurchase: (priceId: string) => handleCheckout(priceId, 'newsletter'),
    isLoading: isLoadingNewsletter,
    isSubscribed: isSubscribedToNewsletter
  };

  const creatorCard = {
    title: "X (Twitter) Creator Platform",
    price: "$19",
    description: "Grow your twitter following with high quality tweets created using your voice with current trends and topics",
    features: [
      "Analytics dashboard",
      "AI 'voice profile' tweet generation",
      "Enriches tweets with real-time context",
      "Additional creator tools for content"
    ],
    ctaText: "Get Started",
    popular: false,
    buttonClassName: "bg-[#0ea5e9] hover:bg-[#0284c7] text-white",
    platformIcon: (
      <div className="w-16 h-16 rounded-full bg-[#f2f2f2] flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
          <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" fill="currentColor"/>
        </svg>
      </div>
    ),
    priceId: "price_1RRXZ2DBIslKIY5s4gxpBlME",
    onPurchase: (priceId: string) => handleCheckout(priceId, 'creator'),
    isLoading: isLoadingCreator,
    isSubscribed: isSubscribedToCreator
  };

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="container px-4 md:px-6">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10 opacity-20 overflow-hidden">
          <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
          <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl"></div>
          <div className="bg-pattern-dots absolute inset-0 opacity-20"></div>
        </div>

        <div className="mx-auto flex max-w-5xl flex-col items-center space-y-8 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Choose Your Platform</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed">
              Select the perfect solution for your needs.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 lg:gap-4 w-full max-w-4xl justify-center items-center md:items-stretch">
            {/* Auto Newsletter Platform Card */}
            <PricingCard {...newsletterCard} />
            
            {/* X Creator Platform Card */}
            <PricingCard {...creatorCard} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
