
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";
import { useEffect } from "react";

const Settings = () => {
  const { authState, checkSubscription } = useAuth();
  const { profile } = authState;

  // Check subscription status when the component mounts
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and subscription
        </p>
      </div>
      
      <Tabs defaultValue="subscription" className="w-full">
        <TabsList className="w-full md:w-auto mb-4">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionStatusCard />
          
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
        
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Preference settings will be available soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
