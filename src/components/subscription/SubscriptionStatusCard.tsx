
import { CalendarIcon, CheckCircle, Settings, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SubscriptionStatusCard() {
  const { authState, checkSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  
  const { profile } = authState;
  
  const isSubscribed = profile?.subscribed;
  const subscriptionTier = profile?.subscription_tier || "None";
  const subscriptionEnd = profile?.subscription_period_end ? 
    new Date(profile.subscription_period_end) : null;
  const willCancel = profile?.cancel_at_period_end;
  const remainingNewsletterGenerations = profile?.remaining_newsletter_generations || 0;
  
  const handleCheckStatus = async () => {
    setIsLoading(true);
    try {
      await checkSubscription();
      toast.success("Subscription status updated");
    } catch (error) {
      console.error("Error checking subscription:", error);
      toast.error("Failed to update subscription status");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) {
        console.error("Error opening customer portal:", error);
        toast.error("Could not open subscription management portal");
        return;
      }
      
      if (data?.url) {
        // Open the customer portal in a new tab
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error in handleManageSubscription:", error);
      toast.error("Something went wrong");
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Subscription Status
        </CardTitle>
        <CardDescription>
          Manage your subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isSubscribed 
                ? "bg-green-100 text-green-800" 
                : "bg-gray-100 text-gray-800"
            }`}>
              {isSubscribed ? "Active" : "Inactive"}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plan:</span>
            <span className="text-sm">{subscriptionTier}</span>
          </div>
          
          {subscriptionEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Renewal Date:</span>
              <span className="text-sm flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(subscriptionEnd, "MMM d, yyyy")}
              </span>
            </div>
          )}
          
          {isSubscribed && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto-Renew:</span>
              <span className={`text-sm ${willCancel ? "text-amber-600" : "text-green-600"}`}>
                {willCancel ? "Will cancel" : "Enabled"}
              </span>
            </div>
          )}
          
          {/* Add Newsletter Generations counter */}
          {subscriptionTier?.toLowerCase().includes('newsletter') && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Newsletter Generations:</span>
              <span className="text-sm flex items-center gap-1">
                <Bookmark className="h-3 w-3" />
                <span className={remainingNewsletterGenerations > 0 ? "text-green-600 font-medium" : "text-gray-600"}>
                  {remainingNewsletterGenerations}
                </span>
              </span>
            </div>
          )}
        </div>
        
        {isSubscribed && (
          <div className="rounded-md bg-blue-50 p-3">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Active Subscription</h3>
                <div className="mt-1 text-sm text-blue-700">
                  You have access to all {subscriptionTier.toLowerCase()} features. Your subscription will{" "}
                  {willCancel ? "cancel" : "renew"} on{" "}
                  {subscriptionEnd ? format(subscriptionEnd, "MMMM d, yyyy") : "N/A"}.
                  
                  {/* Add newsletter generations if applicable */}
                  {subscriptionTier?.toLowerCase().includes('newsletter') && remainingNewsletterGenerations > 0 && (
                    <p className="mt-1">
                      You have <span className="font-medium">{remainingNewsletterGenerations} newsletter generations</span> available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2 pt-2">
          {isSubscribed && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          )}
          
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full" 
            onClick={handleCheckStatus}
            disabled={isLoading}
          >
            {isLoading ? "Checking..." : "Refresh Status"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
