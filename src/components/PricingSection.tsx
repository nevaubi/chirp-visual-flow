
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  popular?: boolean;
  className?: string;
  buttonClassName?: string;
  priceId?: string;
  disabled?: boolean;
  isCurrentPlan?: boolean;
  onSelectPlan?: () => void;
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
  priceId,
  disabled = false,
  isCurrentPlan = false,
  onSelectPlan
}: PricingCardProps) => (
  <Card className={cn(
    "flex flex-col border-border/30 shadow-md transition-all duration-200 hover:shadow-lg",
    popular && "relative border-primary/30 shadow-lg hover:shadow-xl",
    isCurrentPlan && "border-2 border-green-500",
    className
  )}>
    {popular && (
      <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
        Most Popular
      </div>
    )}
    {isCurrentPlan && (
      <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
        Your Plan
      </div>
    )}
    <CardHeader>
      <CardTitle className="text-xl">{title}</CardTitle>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/month</span>
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
      <Button 
        className={cn("w-full", buttonClassName)} 
        onClick={onSelectPlan}
        disabled={disabled || isCurrentPlan}
      >
        {isCurrentPlan ? "Current Plan" : ctaText}
      </Button>
    </CardFooter>
  </Card>
);

const PricingSection = () => {
  const [activeTab, setActiveTab] = useState("creator");
  const [isLoading, setIsLoading] = useState(false);
  const { authState, signInWithTwitter } = useAuth();
  
  const isAuthenticated = !!authState.user;
  const { subscription_tier: currentPlan = null } = authState.profile || {};

  const handlePlanSelection = async (priceId: string, platformType: string) => {
    if (!isAuthenticated) {
      toast.info("Please sign in to continue", {
        description: "You need to be signed in to subscribe to a plan.",
        action: {
          label: "Sign in",
          onClick: signInWithTwitter
        }
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, platformType }
      });

      if (error || !data.url) {
        throw new Error(error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Something went wrong", {
        description: "We couldn't process your request. Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Define Stripe price IDs (these would come from your Stripe dashboard)
  // Replace these with your actual Stripe price IDs
  const CREATOR_BASIC_PRICE_ID = "price_1OthghK3YXUQbpkVoZdpvRH1"; 
  const CREATOR_PRO_PRICE_ID = "price_1OthiPK3YXUQbpkVf1qHULpj";
  const NEWSLETTER_STANDARD_PRICE_ID = "price_1OthsaK3YXUQbpkVkKcIpQrL";
  const NEWSLETTER_PREMIUM_PRICE_ID = "price_1OthtLK3YXUQbpkVqqP3FKp0";

  const creatorCards = [
    {
      title: "Creator Basic",
      price: "$19",
      description: "Everything you need to grow your Twitter presence",
      features: [
        "Analytics dashboard",
        "Audience insights",
        "Content scheduler",
        "Engagement tracking",
        "Basic growth recommendations"
      ],
      ctaText: "Get Started",
      popular: false,
      buttonClassName: "bg-[#0087C8] hover:bg-[#0077B5] text-white",
      priceId: CREATOR_BASIC_PRICE_ID,
      isCurrentPlan: currentPlan === "Creator Basic"
    },
    {
      title: "Creator Pro",
      price: "$49",
      description: "Advanced features for serious Twitter creators",
      features: [
        "Everything in Basic",
        "Advanced analytics",
        "AI content suggestions",
        "Competitor analysis",
        "Priority support",
        "Custom growth strategy"
      ],
      ctaText: "Get Started",
      popular: true,
      buttonClassName: "bg-[#0087C8] hover:bg-[#0077B5] text-white",
      priceId: CREATOR_PRO_PRICE_ID,
      isCurrentPlan: currentPlan === "Creator Pro"
    }
  ];

  const newsletterCards = [
    {
      title: "Newsletter Standard",
      price: "$10",
      description: "Transform your bookmarks into engaging newsletters",
      features: [
        "Automated newsletter generation",
        "Custom templates",
        "Scheduled sending",
        "Up to 1,000 subscribers",
        "Email analytics"
      ],
      ctaText: "Get Started",
      popular: false,
      buttonClassName: "bg-amber-500 hover:bg-amber-600 text-white",
      priceId: NEWSLETTER_STANDARD_PRICE_ID,
      isCurrentPlan: currentPlan === "Newsletter Standard"
    },
    {
      title: "Newsletter Premium",
      price: "$20",
      description: "Advanced newsletter features for growing audiences",
      features: [
        "Everything in Standard",
        "Up to 5,000 subscribers",
        "Advanced customization",
        "Subscriber management",
        "Priority support",
        "AI-powered content curation"
      ],
      ctaText: "Get Started",
      popular: true,
      buttonClassName: "bg-amber-500 hover:bg-amber-600 text-white",
      priceId: NEWSLETTER_PREMIUM_PRICE_ID,
      isCurrentPlan: currentPlan === "Newsletter Premium"
    }
  ];

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
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Choose Your Plan</h2>
            <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed">
              Select the perfect plan for your needs. Start growing your audience today.
            </p>
          </div>

          <Tabs 
            defaultValue="creator" 
            onValueChange={(value) => setActiveTab(value)}
            className="w-full"
          >
            <div className="flex justify-center">
              <TabsList className="mb-8 grid w-fit grid-cols-2 bg-muted/80">
                <TabsTrigger 
                  value="creator" 
                  className={activeTab === "creator" ? "bg-[#0087C8] text-white" : ""}
                >
                  X (Twitter) Creator Platform
                </TabsTrigger>
                <TabsTrigger 
                  value="newsletter" 
                  className={activeTab === "newsletter" ? "bg-amber-500 text-white" : ""}
                >
                  Auto Bookmarks Newsletter
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="creator" className="animate-fade-in">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                {creatorCards.map((card, i) => (
                  <PricingCard 
                    key={i} 
                    {...card} 
                    disabled={isLoading}
                    onSelectPlan={() => handlePlanSelection(card.priceId!, "creator")} 
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="newsletter" className="animate-fade-in">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                {newsletterCards.map((card, i) => (
                  <PricingCard 
                    key={i} 
                    {...card} 
                    disabled={isLoading}
                    onSelectPlan={() => handlePlanSelection(card.priceId!, "newsletter")} 
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-sm text-gray-500">
            All plans include a 14-day free trial. No credit card required.
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
