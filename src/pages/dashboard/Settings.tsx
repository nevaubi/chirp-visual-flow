
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";
import { NewsletterPreferences } from "@/components/settings/NewsletterPreferences";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const { authState, checkSubscription } = useAuth();
  const { profile } = authState;
  const isNewsletterPlatform = profile?.is_newsletter_platform;

  // Check subscription status when the component mounts
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Check if the user has a manual newsletter preference
  const hasManualPreference = profile?.newsletter_day_preference?.startsWith('Manual:');

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
          
          {profile?.subscribed && hasManualPreference && (
            <Card>
              <CardHeader>
                <CardTitle>Newsletter Generations</CardTitle>
                <CardDescription>
                  You've selected manual newsletter generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <p className="text-sm">Remaining this month:</p>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {profile.remaining_newsletter_generations || 0}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your account will be credited with{' '}
                  {profile.newsletter_day_preference === 'Manual: 8' ? '8' : '4'}{' '}
                  newsletter generations at the beginning of each billing cycle.
                </p>
              </CardContent>
            </Card>
          )}
          
          {!profile?.subscribed && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrade Your Experience</CardTitle>
                <CardDescription>
                  Subscribe to unlock premium newsletter features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You're currently on the free plan. Subscribe to our newsletter 
                  service to access advanced features like premium templates,
                  analytics, and more.
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
