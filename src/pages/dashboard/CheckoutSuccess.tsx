
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
  const { authState, refreshProfile } = useAuth();
  
  // Use refs to prevent multiple executions
  const subscriptionCheckedRef = useRef(false);
  const initialCheckDoneRef = useRef(false);
  const timeoutIdRef = useRef<number | null>(null);
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // Ensure we release resources when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // Pre-populate email field with user's email if available
  useEffect(() => {
    if (authState.user?.email && !form.getValues("email")) {
      form.setValue("email", authState.user.email);
    }
  }, [authState.user, form]);

  // Force end loading state after a timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading && !initialCheckDoneRef.current) {
      timeoutIdRef.current = window.setTimeout(() => {
        setIsLoading(false);
        initialCheckDoneRef.current = true;
        
        if (!subscriptionCheckedRef.current && sessionId) {
          toast.warning("Loading took longer than expected. Please proceed with saving your email.");
        }
      }, 5000); // 5-second timeout
    }
    
    return () => {
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [isLoading, sessionId]);

  // Handle subscription check
  useEffect(() => {
    let isMounted = true;
    
    const checkSubscriptionStatus = async () => {
      // Only check subscription once per session ID and only if we have all required data
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
        
        if (error && isMounted) {
          console.error("Error checking subscription:", error);
          toast.error("Error checking subscription status");
          setIsLoading(false);
        } else if (isMounted) {
          toast.success("Subscription activated successfully!");
          
          // After successful subscription check, refresh the user's profile to get updated preferences
          await refreshProfile();
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in checkout success:", error);
        if (isMounted) {
          toast.error("Something went wrong");
          setIsLoading(false);
        }
      }
    };

    // Only run the subscription check if we have the required data
    if (authState.user && !authState.loading && sessionId && !subscriptionCheckedRef.current) {
      // Add slight delay to avoid potential race conditions
      setTimeout(() => {
        if (isMounted) {
          checkSubscriptionStatus();
        }
      }, 500);
    } else if (!authState.loading && !sessionId) {
      // If no sessionId is present, we don't need to check subscription
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
        
        // Automatically redirect to dashboard after successful email submission
        setTimeout(() => {
          navigate("/dashboard/home");
        }, 2000);
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
        
        <p className="text-muted-foreground mb-6">
          Your newsletter subscription is activated! Please enter the email address where you'd like to receive your newsletters.
        </p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email for Newsletter Delivery</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="your@email.com" 
                      type="email"
                      {...field} 
                      disabled={isSubmitting}
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-600 text-lg py-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Email & Continue"}
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
      </div>
    </div>
  );
};

export default CheckoutSuccess;
