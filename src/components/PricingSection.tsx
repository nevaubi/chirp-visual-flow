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
    "flex flex-col border-border/30 shadow-md transition-all duration-200 hover:shadow-lg h-full max-w-sm mx-auto",
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
      <CardDescription className="pt-1.5">{description}</CardDescription>
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
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10">
        <Bookmark className="h-8 w-8 text-amber-500" />
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
    description: "Everything you need to grow your Twitter presence",
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
    buttonClassName: "bg-[#0087C8] hover:bg-[#0077B5] text-white",
    platformIcon: (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0087C8]/10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#0087C8]">
          <path d="M22 4.01C21.9992 3.55 21.8248 3.10929 21.5144 2.78004C21.204 2.45079 20.7759 2.25137 20.32 2.22C19.99 2.2 19.69 2.26 19.42 2.37C18.1079 2.86 16.9779 3.71147 16.16 4.83C16.0663 4.96121 16.0254 5.11742 16.0435 5.27092C16.0615 5.42443 16.1375 5.56567 16.2563 5.66693C16.3751 5.76818 16.5281 5.82233 16.6831 5.81945C16.8381 5.81657 16.9888 5.75686 17.1032 5.65073C17.9622 4.85349 19.0885 4.4422 20.24 4.5C20.39 4.5 20.56 4.5 20.74 4.5C20.94 5.5 18.5 6 17.25 6.5C16.9062 6.64823 16.5865 6.85315 16.3 7.1C15.42 7.8 14.56 9.25 14.25 10C14.1508 10.2517 14.0016 10.4782 13.81 10.67C13.11 11.4 12.35 11.28 11.53 11.16C10.1 10.95 9.46 10.23 8.38 9.75C7.3 9.27 6.12 8.85 4.7 9.05C3.28 9.25 2.19 10.13 1.5 11.5C1.28 12 1.13 12.61 1.03 13.19C1 13.39 1 13.6 1 14C1 14.4 1 15 1 15C1.73491 15.3637 2.5536 15.5531 3.38 15.55C5.3967 15.5359 7.33486 14.8166 8.85 13.52C8.93573 13.4465 9.0097 13.3583 9.07 13.26C9.15803 13.0841 9.1855 12.8835 9.14815 12.689C9.11081 12.4945 9.01077 12.3174 8.86444 12.1844C8.7181 12.0514 8.53392 11.9702 8.33671 11.9538C8.1395 11.9374 7.94271 11.9867 7.78 12.094C7.65973 12.1575 7.55086 12.2412 7.45917 12.3414C7.36748 12.4415 7.29454 12.5568 7.24389 12.6818C7.19323 12.8069 7.16569 12.9399 7.16272 13.0748C7.15974 13.2097 7.18138 13.344 7.22667 13.471C5.74036 14.7325 3.94333 15.5344 2.03 15.8C1.86 15.8 1.73 15.8 1.63 15.8C2.11 16.8667 2.97 17.7333 4.21 18.4C5.8 19.2667 7.66333 19.7 9.8 19.7C12.4667 19.7 14.85 19.0667 16.95 17.8C19.05 16.5333 20.6667 14.8333 21.8 12.7C22.4008 11.5165 22.7759 10.2329 22.91 8.91C22.97 8.3 23 7.81 23 7.5C23 7.19 23 7 23 7C23 6.5 23 6 23 6C23.03 5.7 22.77 5.57 22.5 5.5C22.23 5.43 21.83 5.56 21.5 5.7C21.17 5.84 20.77 6.06 20.3 6.25C19.83 6.44 19.28 6.61 18.8 6.7C20.2 5.25 21.11 3.24 22 4.01Z" fill="currentColor"/>
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
