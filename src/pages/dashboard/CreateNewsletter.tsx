
/*
 * DEPRECATED: This component has been intentionally disconnected from the application.
 * It's being preserved for reference as parts of it may be reused in a future implementation.
 * The Stripe checkout workflow will be relocated and modified in a future update.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BookmarkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Form,
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

const CreateNewsletter = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const isMobile = useIsMobile();

  // Define all the state variables with default values for hidden sections
  const [selectedAudience, setSelectedAudience] = useState<'personal' | 'audience'>('personal');
  const [selectedFrequency, setSelectedFrequency] = useState<'biweekly' | 'weekly' | null>(null);
  const [weeklyDay, setWeeklyDay] = useState<'Tuesday' | 'Friday' | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<'scheduled' | 'manual' | null>(null);
  const [contentApproach, setContentApproach] = useState<'everything' | 'topics' | null>(null);
  const [topics, setTopics] = useState<string>('');
  const [writingStyle, setWritingStyle] = useState<'first' | 'third' | 'emulate'>('third');
  const [styleExample, setStyleExample] = useState<string>('');
  const [includeMedia, setIncludeMedia] = useState<boolean>(true);
  const [includeSignature, setIncludeSignature] = useState<boolean>(false);
  const [newsletterName, setNewsletterName] = useState<string>('Auto-generated Newsletter');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('template1');

  // Determine if the form is valid for submission (adjusted for default values)
  const isFormValid = () => {
    return (
      selectedFrequency &&
      ((selectedFrequency === 'biweekly' && deliveryOption) ||
        (selectedFrequency === 'weekly' &&
          (deliveryOption === 'manual' || weeklyDay))) &&
      (contentApproach === 'everything' ||
        (contentApproach === 'topics' && topics.trim().length > 0))
    );
  };

  const handleCreateClick = () => {
    setShowIntro(false);
    console.log('Create newsletter workflow started');
  };

  const handleFrequencySelect = (freq: 'biweekly' | 'weekly') => {
    setSelectedFrequency(freq);
    setWeeklyDay(null);
    setDeliveryOption(null);
    console.log(`Selected frequency: ${freq}`);
  };

  // Get the day preference based on user selections
  const getDayPreference = (): string => {
    if (selectedFrequency === 'biweekly') {
      return deliveryOption === 'manual' ? 'Manual: 8' : 'Tuesday-Friday';
    } else if (selectedFrequency === 'weekly') {
      return deliveryOption === 'manual' ? 'Manual: 4' : weeklyDay || '';
    }
    return '';
  };

  // Prepare newsletter content preferences as JSON
  const getContentPreferences = () => {
    return {
      audience: selectedAudience,
      frequency: selectedFrequency,
      content_approach: contentApproach,
      topics: contentApproach === 'topics' ? topics : undefined,
      writing_style: writingStyle,
      style_example: writingStyle === 'emulate' ? styleExample : undefined,
      include_media: includeMedia,
      add_signature: includeSignature,
      newsletter_name: newsletterName,
      template: selectedTemplate
    };
  };

  const handleCheckout = async () => {
    try {
      if (!authState.user) {
        toast.error("You must be logged in to subscribe");
        return;
      }

      setIsSubmitting(true);
      
      // Determine which price ID to use based on frequency
      const priceId = selectedFrequency === 'weekly' 
        ? 'price_1RQUm7DBIslKIY5sNlWTFrQH'  // Newsletter Standard
        : 'price_1RQUmRDBIslKIY5seHRZm8Gr';  // Newsletter Premium

      // Get day preference and content preferences
      const dayPreference = getDayPreference();
      const contentPreferences = getContentPreferences();
      
      // Set the initial number of remaining generations based on the manual preference
      const remainingGenerations = dayPreference === 'Manual: 8' ? 8 : dayPreference === 'Manual: 4' ? 4 : null;

      // Call the create-checkout edge function with preferences included in metadata
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          frequency: selectedFrequency,
          metadata: {
            newsletter_day_preference: dayPreference,
            newsletter_content_preferences: JSON.stringify(contentPreferences),
            remaining_newsletter_generations: remainingGenerations
          }
        },
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        toast.error('Failed to create checkout session');
        setIsSubmitting(false);
        return;
      }

      // Redirect to Stripe checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('No checkout URL returned');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error in handleCheckout:', error);
      toast.error('An error occurred while processing your request');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4">
      {showIntro ? (
        // Initial view
        <div className="max-w-3xl w-full text-center space-y-6 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Create Your Newsletter
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
            Start sending engaging newsletters from your bookmarks in just a few clicks.
          </p>
          <Button
            onClick={handleCreateClick}
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-5 h-auto text-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookmarkIcon className="mr-2 h-5 w-5" />
            Begin Creating
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-2xl animate-fade-in">
          <Card className="shadow-md">
            <CardHeader className="border-b p-4">
              <CardTitle className="text-xl">Create Your Newsletter</CardTitle>
              <CardDescription>
                Set up your newsletter subscription
              </CardDescription>
            </CardHeader>
            
            <div className="flex flex-col">
              {/* Main content - No more ScrollArea */}
              <div className={`px-4 py-2 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                {/* Frequency Section - More compact */}
                <div className="space-y-2">
                  <h2 className="text-base font-semibold">How often do you want your newsletter?</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Biweekly */}
                    <Card
                      onClick={() => handleFrequencySelect('biweekly')}
                      className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                        selectedFrequency === 'biweekly' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <CardHeader className="p-2">
                        <CardTitle className="text-sm">Biweekly</CardTitle>
                        <CardDescription className="text-xs">
                          <div>up to 30 tweets</div>
                          <div className="font-medium text-sm mt-1">$19 / month</div>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    {/* Weekly */}
                    <Card
                      onClick={() => handleFrequencySelect('weekly')}
                      className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                        selectedFrequency === 'weekly' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <CardHeader className="p-2">
                        <CardTitle className="text-sm">Weekly</CardTitle>
                        <CardDescription className="text-xs">
                          <div>up to 50 tweets</div>
                          <div className="font-medium text-sm mt-1">$10 / month</div>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>

                  {selectedFrequency && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      <h3 className="text-xs font-medium mb-1">Delivery preference</h3>
                      
                      {selectedFrequency === 'biweekly' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Card
                            onClick={() => setDeliveryOption('scheduled')}
                            className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                              deliveryOption === 'scheduled' ? 'border-primary bg-primary/5' : ''
                            }`}
                          >
                            <CardHeader className="p-2">
                              <CardTitle className="text-xs">Tuesday & Friday</CardTitle>
                            </CardHeader>
                          </Card>
                          <Card
                            onClick={() => {
                              setDeliveryOption('manual');
                              setWeeklyDay(null);
                            }}
                            className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                              deliveryOption === 'manual' ? 'border-primary bg-primary/5' : ''
                            }`}
                          >
                            <CardHeader className="p-2">
                              <CardTitle className="text-xs">Manual</CardTitle>
                              <CardDescription className="text-xs">
                                8 credits/month
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        </div>
                      )}
                      
                      {selectedFrequency === 'weekly' && (
                        <div className="grid grid-cols-3 gap-1">
                          <Card
                            onClick={() => {
                              setWeeklyDay('Tuesday');
                              setDeliveryOption('scheduled');
                            }}
                            className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                              deliveryOption === 'scheduled' && weeklyDay === 'Tuesday'
                                ? 'border-primary bg-primary/5'
                                : ''
                            }`}
                          >
                            <CardHeader className="p-2">
                              <CardTitle className="text-xs">Tuesday</CardTitle>
                            </CardHeader>
                          </Card>
                          <Card
                            onClick={() => {
                              setWeeklyDay('Friday');
                              setDeliveryOption('scheduled');
                            }}
                            className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                              deliveryOption === 'scheduled' && weeklyDay === 'Friday'
                                ? 'border-primary bg-primary/5'
                                : ''
                            }`}
                          >
                            <CardHeader className="p-2">
                              <CardTitle className="text-xs">Friday</CardTitle>
                            </CardHeader>
                          </Card>
                          <Card
                            onClick={() => {
                              setWeeklyDay(null);
                              setDeliveryOption('manual');
                            }}
                            className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                              deliveryOption === 'manual' ? 'border-primary bg-primary/5' : ''
                            }`}
                          >
                            <CardHeader className="p-2">
                              <CardTitle className="text-xs">Manual</CardTitle>
                              <CardDescription className="text-xs">
                                4 credits/month
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator className="my-1" />

                {/* Content Approach Section - More compact */}
                <div className="space-y-2">
                  <h2 className="text-base font-semibold">Content approach</h2>
                  <div className="space-y-1">
                    <Card
                      onClick={() => setContentApproach('everything')}
                      className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                        contentApproach === 'everything' ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <CardHeader className="py-2 px-3">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${contentApproach === 'everything' ? 'bg-primary' : 'border border-gray-300'}`}></div>
                          <div>
                            <CardTitle className="text-xs">All bookmarks</CardTitle>
                            <CardDescription className="text-xs">Use all bookmarked tweets</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <Collapsible
                      open={contentApproach === 'topics'}
                      onOpenChange={(open) => {
                        if (open) setContentApproach('topics');
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <Card
                          className={`cursor-pointer transition-all hover:shadow-md border-2 hover:border-primary/50 ${
                            contentApproach === 'topics' ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <CardHeader className="py-2 px-3">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${contentApproach === 'topics' ? 'bg-primary' : 'border border-gray-300'}`}></div>
                              <div>
                                <CardTitle className="text-xs">General topics only</CardTitle>
                                <CardDescription className="text-xs">Stick with specific topics</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-2 pt-0 pl-6">
                          <Input
                            value={topics}
                            onChange={(e) => setTopics(e.target.value)}
                            placeholder="Type topics here..."
                            className="mt-1 text-xs py-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Type your desired main topics
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </div>
              
              {/* Pricing summary - Fixed at bottom */}
              <div className="bg-muted/30 p-2 mt-2 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-xs">Your subscription:</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFrequency === 'weekly' 
                        ? 'Weekly Newsletter' 
                        : selectedFrequency === 'biweekly' 
                          ? 'Biweekly Newsletter' 
                          : 'Select a frequency'}
                    </p>
                  </div>
                  <div className="text-base font-bold">
                    {selectedFrequency === 'weekly' 
                      ? '$10/month' 
                      : selectedFrequency === 'biweekly' 
                        ? '$19/month' 
                        : '—'}
                  </div>
                </div>
              </div>
            </div>
            
            <CardFooter className="border-t p-3 flex justify-end">
              <Button
                onClick={handleCheckout}
                disabled={!isFormValid() || isSubmitting}
                className="bg-amber-500 text-white px-5 py-1 hover:bg-amber-600 h-auto w-full sm:w-auto"
              >
                {isSubmitting ? 'Processing...' : 'Subscribe Now'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CreateNewsletter;
