
import React from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NewsletterPreferencesFormValues {
  newsletter_day_preference: string;
  audience: string;
  frequency: string;
  content_approach: string;
  writing_style: string;
  include_media: boolean;
  add_signature: boolean;
  newsletter_name: string;
  template: string;
}

export function NewsletterPreferences() {
  const { authState, refreshProfile } = useAuth();
  const { profile } = authState;
  const { toast } = useToast();

  const defaultValues: NewsletterPreferencesFormValues = {
    newsletter_day_preference: profile?.newsletter_day_preference || "",
    audience: profile?.newsletter_content_preferences?.audience || "",
    frequency: profile?.newsletter_content_preferences?.frequency || "",
    content_approach: profile?.newsletter_content_preferences?.content_approach || "",
    writing_style: profile?.newsletter_content_preferences?.writing_style || "",
    include_media: profile?.newsletter_content_preferences?.include_media === "Yes",
    add_signature: profile?.newsletter_content_preferences?.add_signature === "Yes",
    newsletter_name: profile?.newsletter_content_preferences?.newsletter_name || "",
    template: profile?.newsletter_content_preferences?.template || "template1",
  };

  const form = useForm<NewsletterPreferencesFormValues>({
    defaultValues,
  });

  const onSubmit = async (data: NewsletterPreferencesFormValues) => {
    if (!profile) return;

    try {
      const newsletterContentPreferences = {
        audience: data.audience,
        frequency: data.frequency,
        content_approach: data.content_approach,
        writing_style: data.writing_style,
        include_media: data.include_media ? "Yes" : "No",
        add_signature: data.add_signature ? "Yes" : "No",
        newsletter_name: data.newsletter_name,
        template: data.template,
      };

      // Determine if this is a change to/from a manual preference
      const isManualPreference = data.newsletter_day_preference === "Custom" || 
                                data.newsletter_day_preference === "Bi" || 
                                data.newsletter_day_preference.startsWith("Manual:");
      
      // Set the appropriate manual value if custom is selected
      let dayPreference = data.newsletter_day_preference;
      let remainingGenerations = profile.remaining_newsletter_generations;
      
      if (data.newsletter_day_preference === "Custom") {
        // If frequency is weekly, use Manual: 4, otherwise use Manual: 8
        const isWeekly = data.frequency === "Weekly - Automatic" || 
                        data.frequency === "Weekly - Manual generation";
        dayPreference = isWeekly ? "Manual: 4" : "Manual: 8";
        remainingGenerations = isWeekly ? 4 : 8;
      } else if (data.newsletter_day_preference === "Bi") {
        dayPreference = "Manual: 8";
        remainingGenerations = 8;
      } else if (!isManualPreference) {
        // If changing from manual to automatic, clear the remaining generations
        remainingGenerations = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          newsletter_day_preference: dayPreference,
          newsletter_content_preferences: newsletterContentPreferences,
          remaining_newsletter_generations: remainingGenerations
        })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Preferences updated",
        description: "Your newsletter preferences have been saved.",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Newsletter Preferences</CardTitle>
        <CardDescription>
          Configure how your newsletter is generated and delivered
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="newsletter_day_preference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Day</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preferred day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Tuesday">Tuesday</SelectItem>
                        <SelectItem value="Friday">Friday</SelectItem>
                        <SelectItem value="Bi">Bi-weekly</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose when your newsletter will be delivered
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Personal">Personal</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Community">Community</SelectItem>
                        <SelectItem value="Subscribers">Subscribers</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly - Automatic">Weekly - Automatic</SelectItem>
                        <SelectItem value="Weekly - Manual generation">Weekly - Manual generation</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content_approach"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Approach</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content approach" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Everything from bookmarks">Everything from bookmarks</SelectItem>
                        <SelectItem value="Curated selection">Curated selection</SelectItem>
                        <SelectItem value="Themed content">Themed content</SelectItem>
                        <SelectItem value="Mix of bookmarks and trending">Mix of bookmarks and trending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="writing_style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Writing Style</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select writing style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="First person">First person</SelectItem>
                        <SelectItem value="Third person">Third person</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Conversational">Conversational</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newsletter_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Newsletter Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter newsletter name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your newsletter a catchy name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="template1">Default Template</SelectItem>
                        <SelectItem value="template2">Minimal</SelectItem>
                        <SelectItem value="template3">Professional</SelectItem>
                        <SelectItem value="template4">Creative</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="include_media"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Include Media</FormLabel>
                        <FormDescription>
                          Include images and media from posts
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="add_signature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Add Signature</FormLabel>
                        <FormDescription>
                          Include your personal signature
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit">Save Preferences</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
