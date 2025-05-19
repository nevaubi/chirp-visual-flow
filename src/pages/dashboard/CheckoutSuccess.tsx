
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Form schema with validation
const formSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
});

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const { authState, refreshProfile } = useAuth();
  const subscriptionCheckedRef = useRef(false);
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    // Pre-populate the email field with the user's email if available
    if (authState.user?.email && !form.getValues("email")) {
      form.setValue("email", authState.user.email);
    }
  }, [authState.user, form]);

  useEffect(() => {
    let isMounted = true;
    
    const checkSubscriptionStatus = async () => {
      // Only check subscription once per sessionId
      if (subscriptionCheckedRef.current || !sessionId || !authState.user || authState.loading) {
        return;
      }
      
      try {
        setIsLoading(true);
        subscriptionCheckedRef.current = true;
        
        // Call the check-subscription function and pass the session ID
        const { data, error } = await supabase.functions.invoke("check-subscription", {
          body: { session_id: sessionId }
        });
        
        if (error) {
          console.error("Error checking subscription:", error);
          if (isMounted) {
            toast.error("Error checking subscription status");
          }
        } else {
          if (isMounted) {
            toast.success("Subscription activated successfully!");
            setIsSubscriptionActive(true);
            
            // After successful subscription check, refresh the user's profile to get updated preferences
            await refreshProfile();
          }
        }
      } catch (error) {
        console.error("Error in checkout success:", error);
        if (isMounted) {
          toast.error("Something went wrong");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (authState.user && !authState.loading && sessionId) {
      checkSubscriptionStatus();
    } else if (!authState.loading) {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [sessionId, authState.user, authState.loading, refreshProfile]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!authState.user) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({ sending_email: values.email })
        .eq("id", authState.user.id);
      
      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to save email address");
      } else {
        toast.success("Email saved successfully!");
        
        // Refresh the profile to ensure we have the latest data
        await refreshProfile();
      }
    } catch (error) {
      console.error("Error saving email:", error);
      toast.error("Something went wrong while saving your email");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <>
            <p className="text-muted-foreground mb-6">
              Your newsletter subscription's activated! Add the email to receive your newsletters below and you're all set.
            </p>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiving Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your@email.com" 
                          type="email"
                          {...field} 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Submit"}
                </Button>
              </form>
            </Form>
            
            {authState.profile?.newsletter_day_preference && (
              <div className="mb-6 p-4 bg-amber-50 rounded-lg">
                <h3 className="font-semibold mb-2">Your Newsletter Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Delivery: <span className="font-medium">{authState.profile.newsletter_day_preference}</span>
                </p>
                {authState.profile.newsletter_content_preferences && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Type: <span className="font-medium">
                      {authState.profile.newsletter_content_preferences.audience === 'personal' 
                        ? 'Personal Newsletter' 
                        : 'Audience Newsletter'}
                    </span>
                  </p>
                )}
              </div>
            )}
          </>
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
