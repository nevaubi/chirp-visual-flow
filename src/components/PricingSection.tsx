
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
    "flex flex-col border-border/30 shadow-md transition-all duration-200 hover:shadow-lg h-full max-w-xs mx-auto",
    popular && "relative border-primary/30 shadow-lg hover:shadow-xl",
    isSubscribed && "border-green-500/50 bg-green-50/30",
    className
  )}>
    {popular && (
      <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
        Most Popular
      </div>
    )}
    {isSubscribed && (
      <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
        Your Plan
      </div>
    )}
    <CardHeader className="pb-6">
      <div className="flex items-start justify-between gap-3">
        {platformIcon && (
          <div className="flex-shrink-0">{platformIcon}</div>
        )}
        <CardTitle className="text-lg leading-tight text-right flex-1">{title}</CardTitle>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-base text-muted-foreground">/month</span>
      </div>
      <CardDescription className="pt-1.5 text-base">{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex-1">
      <ul className="space-y-2.5">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter>
      {isSubscribed ? (
        <Button 
          className={cn("w-full bg-green-500 hover:bg-green-600 text-white", buttonClassName)}
          onClick={() => handleManageSubscription()}
          disabled={isLoading}
        >
          Manage Subscription
        </Button>
      ) : (
        <Button 
          className={cn("w-full", buttonClassName)}
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
      "Automated newsletter generation",
      "Custom templates",
      "Scheduled sending",
      "Up to 1,000 subscribers",
      "Email analytics",
      "Bookmark integration"
    ],
    ctaText: "Get Started",
    popular: false,
    buttonClassName: "bg-amber-500 hover:bg-amber-600 text-white",
    platformIcon: (
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10">
        <Bookmark className="h-10 w-10 text-amber-500" />
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
      "Audience insights", 
      "Content scheduler",
      "Engagement tracking",
      "Best posting time recommendations",
      "Growth recommendations"
    ],
    ctaText: "Get Started",
    popular: false,
    buttonClassName: "bg-black hover:bg-gray-800 text-white",
    platformIcon: (
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black/10">
        <svg width="24" height="24" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
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
              Select the perfect solution for your needs. We offer two specialized platforms to help you succeed.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 w-full max-w-2xl">
            {/* Auto Newsletter Platform Card - Now First (Left Side) */}
            <PricingCard {...newsletterCard} />
            
            {/* X Creator Platform Card - Now Second (Right Side) */}
            <PricingCard {...creatorCard} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
