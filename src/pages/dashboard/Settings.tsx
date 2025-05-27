
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";
import { NewsletterPreferences } from "@/components/settings/NewsletterPreferences";
import { useEffect } from "react";
import { Crown, Star } from "lucide-react";

const Settings = () => {
  const { authState, checkSubscription } = useAuth();
  const { profile } = authState;
  const isNewsletterPlatform = profile?.is_newsletter_platform;

  // Check subscription status when the component mounts
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Get current plan details
  const isSubscribed = profile?.subscribed;
  const subscriptionTier = profile?.subscription_tier || "Free";
  const currentPlan = isSubscribed ? subscriptionTier : "Free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your {isNewsletterPlatform ? 'subscription' : 'account settings and subscription'}
        </p>
      </div>
      
      <Tabs defaultValue="subscription" className="w-full">
        {/* Render different tabs based on platform type */}
        <TabsList className="w-full md:w-auto mb-4">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          {!isNewsletterPlatform && (
            <>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionStatusCard />
          
          {!profile?.subscribed && (
            <Card>
              <CardHeader>
                {/* Enhanced Current Plan Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gray-100">
                      <Star className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                      <p className="text-2xl font-bold text-gray-900">{currentPlan}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 text-sm font-semibold text-gray-600 bg-gray-50 border-gray-200">
                    {currentPlan.toUpperCase()}
                  </Badge>
                </div>
                
                <CardTitle>Upgrade Your Experience</CardTitle>
                <CardDescription>
                  Subscribe to unlock premium features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You're currently on the free plan. Subscribe to access premium 
                  features like advanced analytics, automated tools, and more.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Subscribed State */}
          {profile?.subscribed && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <Crown className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                      <p className="text-2xl font-bold text-green-700">{currentPlan}</p>
                    </div>
                  </div>
                  <Badge className="px-3 py-1 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white">
                    {currentPlan.toUpperCase()}
                  </Badge>
                </div>
                
                <CardTitle>Premium Active</CardTitle>
                <CardDescription>
                  You have access to all premium features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Enjoy unlimited access to advanced features, priority support, and more.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Only render Account tab for non-newsletter platforms */}
        {!isNewsletterPlatform && (
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Account</CardTitle>
                <CardDescription>
                  Manage your account details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Username:</span>
                    <span className="text-sm">@{profile?.twitter_handle || 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{profile?.sending_email || 'Not set'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {/* Only render Preferences tab for non-newsletter platforms */}
        {!isNewsletterPlatform && (
          <TabsContent value="preferences" className="space-y-4">
            <NewsletterPreferences />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
