
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
import { BookmarkIcon, User, Users } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';

const CreateNewsletter = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Define all the state variables we need
  const [selectedAudience, setSelectedAudience] = useState<'personal' | 'audience' | null>(null);
  const [selectedFrequency, setSelectedFrequency] =
    useState<'biweekly' | 'weekly' | null>(null);
  const [weeklyDay, setWeeklyDay] = useState<'Tuesday' | 'Friday' | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<'scheduled' | 'manual' | null>(null);
  const [contentApproach, setContentApproach] = useState<'everything' | 'topics' | null>(null);
  const [topics, setTopics] = useState<string>('');
  const [writingStyle, setWritingStyle] = useState<'first' | 'third' | 'emulate' | null>(null);
  const [styleExample, setStyleExample] = useState<string>('');
  const [includeMedia, setIncludeMedia] = useState<boolean | null>(null);
  const [includeSignature, setIncludeSignature] = useState<boolean | null>(null);
  const [newsletterName, setNewsletterName] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Determine if the form is valid for submission
  const isFormValid = () => {
    return (
      selectedAudience &&
      selectedFrequency &&
      ((selectedFrequency === 'biweekly' && deliveryOption) ||
        (selectedFrequency === 'weekly' &&
          (deliveryOption === 'manual' || weeklyDay))) &&
      (contentApproach === 'everything' ||
        (contentApproach === 'topics' && topics.trim().length > 0)) &&
      (writingStyle === 'first' ||
        writingStyle === 'third' ||
        (writingStyle === 'emulate' && styleExample.trim().length > 0)) &&
      includeMedia !== null &&
      includeSignature !== null &&
      newsletterName.trim().length > 0 &&
      selectedTemplate
    );
  };

  const handleCreateClick = () => {
    setShowIntro(false);
    console.log('Create newsletter workflow started');
  };

  const handleAudienceSelect = (type: 'personal' | 'audience') => {
    setSelectedAudience(type);
    console.log(`Selected newsletter type: ${type}`);
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] p-4 md:p-8">
      {showIntro ? (
        // Initial view
        <div className="max-w-3xl w-full text-center space-y-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Create Your Next Newsletter
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Craft engaging newsletters that connect with your audience. Simple, powerful, and ready to deliver your message.
          </p>
          <Button
            onClick={handleCreateClick}
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-white px-10 py-6 h-auto text-lg shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookmarkIcon className="mr-2 h-5 w-5" />
            Begin Creating
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-4xl animate-fade-in">
          <Card className="shadow-md">
            <CardHeader className="text-center border-b pb-6">
              <CardTitle className="text-2xl md:text-3xl">Create Your Newsletter</CardTitle>
              <CardDescription>
                Fill out the form below to set up your customized newsletter.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-18rem)] p-6">
                <div className="space-y-8">
                  {/* Audience Section */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Who's this newsletter for?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        onClick={() => handleAudienceSelect('personal')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                          selectedAudience === 'personal' ? 'border-primary' : ''
                        }`}
                      >
                        <CardHeader className="text-center pb-2">
                          <div className="mx-auto bg-blue-100 rounded-full p-3 mb-3">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle className="text-lg">Personal</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center pb-4">
                          <p className="text-sm text-muted-foreground">
                            A private newsletter for your own use, notes, or personal content.
                          </p>
                        </CardContent>
                      </Card>
                      <Card
                        onClick={() => handleAudienceSelect('audience')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                          selectedAudience === 'audience' ? 'border-amber-500' : ''
                        }`}
                      >
                        <CardHeader className="text-center pb-2">
                          <div className="mx-auto bg-amber-100 rounded-full p-3 mb-3">
                            <Users className="h-6 w-6 text-amber-500" />
                          </div>
                          <CardTitle className="text-lg">For an audience</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center pb-4">
                          <p className="text-sm text-muted-foreground">
                            Create newsletters to share with subscribers, followers, or customers.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Frequency Section */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">How often do you want your newsletter?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Biweekly */}
                      <Card
                        onClick={() => handleFrequencySelect('biweekly')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                          selectedFrequency === 'biweekly' ? 'border-primary' : ''
                        }`}
                      >
                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-lg">Biweekly</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-1 pb-4">
                          <p className="text-sm text-muted-foreground">up to 30 tweets</p>
                          <div className="font-semibold">$19 / month</div>
                        </CardContent>
                      </Card>
                      {/* Weekly */}
                      <Card
                        onClick={() => handleFrequencySelect('weekly')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                          selectedFrequency === 'weekly' ? 'border-primary' : ''
                        }`}
                      >
                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-lg">Weekly</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-1 pb-4">
                          <p className="text-sm text-muted-foreground">up to 50 tweets</p>
                          <div className="font-semibold">$10 / month</div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedFrequency && (
                      <div className="mt-4 pt-2 border-t">
                        <h3 className="text-lg font-medium mb-3">Delivery preference</h3>
                        
                        {selectedFrequency === 'biweekly' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card
                              onClick={() => setDeliveryOption('scheduled')}
                              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                                deliveryOption === 'scheduled' ? 'border-primary' : ''
                              }`}
                            >
                              <CardHeader className="text-center p-4">
                                <CardTitle className="text-lg">Every Tuesday and Friday</CardTitle>
                              </CardHeader>
                            </Card>
                            <Card
                              onClick={() => {
                                setDeliveryOption('manual');
                                setWeeklyDay(null);
                              }}
                              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                                deliveryOption === 'manual' ? 'border-primary' : ''
                              }`}
                            >
                              <CardHeader className="text-center p-4">
                                <CardTitle className="text-lg">Manual</CardTitle>
                                <CardDescription>
                                  Generate manually, 8 credits a month
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          </div>
                        )}
                        
                        {selectedFrequency === 'weekly' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card
                              onClick={() => {
                                setWeeklyDay('Tuesday');
                                setDeliveryOption('scheduled');
                              }}
                              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                                deliveryOption === 'scheduled' && weeklyDay === 'Tuesday'
                                  ? 'border-primary'
                                  : ''
                              }`}
                            >
                              <CardHeader className="text-center p-4">
                                <CardTitle className="text-lg">Tuesday</CardTitle>
                              </CardHeader>
                            </Card>
                            <Card
                              onClick={() => {
                                setWeeklyDay('Friday');
                                setDeliveryOption('scheduled');
                              }}
                              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                                deliveryOption === 'scheduled' && weeklyDay === 'Friday'
                                  ? 'border-primary'
                                  : ''
                              }`}
                            >
                              <CardHeader className="text-center p-4">
                                <CardTitle className="text-lg">Friday</CardTitle>
                              </CardHeader>
                            </Card>
                            <Card
                              onClick={() => {
                                setWeeklyDay(null);
                                setDeliveryOption('manual');
                              }}
                              className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                                deliveryOption === 'manual' ? 'border-primary' : ''
                              }`}
                            >
                              <CardHeader className="text-center p-4">
                                <CardTitle className="text-lg">Manual</CardTitle>
                                <CardDescription>
                                  Generate manually, 4 credits a month
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Content Approach Section */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Content approach</h2>
                    <div className="space-y-3">
                      <Card
                        onClick={() => setContentApproach('everything')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 ${
                          contentApproach === 'everything' ? 'border-primary' : ''
                        }`}
                      >
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-2 ${contentApproach === 'everything' ? 'bg-primary' : 'border border-gray-300'}`}></div>
                            <div>
                              <CardTitle className="text-base">Everything from my bookmarks</CardTitle>
                              <CardDescription>Use every bookmarked tweet since my last newsletter</CardDescription>
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
                            className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 ${
                              contentApproach === 'topics' ? 'border-primary' : ''
                            }`}
                          >
                            <CardHeader className="py-3 px-4">
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-2 ${contentApproach === 'topics' ? 'bg-primary' : 'border border-gray-300'}`}></div>
                                <div>
                                  <CardTitle className="text-base">General topics only</CardTitle>
                                  <CardDescription>Stick with only these general topics</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-0 pl-10">
                            <Input
                              value={topics}
                              onChange={(e) => setTopics(e.target.value)}
                              placeholder="Type topics here..."
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Type your desired main topics and we'll do the rest!
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  <Separator />

                  {/* Writing Style Section */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Choose your writing style</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card
                        onClick={() => setWritingStyle('first')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                          writingStyle === 'first' ? 'border-primary' : ''
                        }`}
                      >
                        <CardHeader className="text-center p-4">
                          <CardTitle className="text-lg">First Person</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card
                        onClick={() => setWritingStyle('third')}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                          writingStyle === 'third' ? 'border-primary' : ''
                        }`}
                      >
                        <CardHeader className="text-center p-4">
                          <CardTitle className="text-lg">Third Person</CardTitle>
                        </CardHeader>
                      </Card>
                      
                      <Collapsible
                        open={writingStyle === 'emulate'}
                        onOpenChange={(open) => {
                          if (open) setWritingStyle('emulate');
                        }}
                      >
                        <CollapsibleTrigger asChild>
                          <Card
                            className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                              writingStyle === 'emulate' ? 'border-primary' : ''
                            }`}
                          >
                            <CardHeader className="text-center p-4">
                              <CardTitle className="text-lg">Emulate a writing style</CardTitle>
                            </CardHeader>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-0">
                            <Textarea
                              value={styleExample}
                              onChange={(e) => setStyleExample(e.target.value)}
                              placeholder="Paste text examples of your desired writing style (max 1000 chars)"
                              maxLength={1000}
                              className="mt-2"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  <Separator />

                  {/* Media & Signature Section */}
                  <div className="space-y-5">
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Include media (tweets/pictures/videos)?</h2>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div 
                          className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${
                            includeMedia === true ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setIncludeMedia(true)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Yes, include media📸</div>
                            <div className={`w-4 h-4 rounded-full ${includeMedia === true ? 'bg-primary' : 'border border-gray-300'}`}></div>
                          </div>
                        </div>
                        <div 
                          className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${
                            includeMedia === false ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setIncludeMedia(false)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">No, text only</div>
                            <div className={`w-4 h-4 rounded-full ${includeMedia === false ? 'bg-primary' : 'border border-gray-300'}`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Include your X handle or signature?</h2>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div 
                          className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${
                            includeSignature === true ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setIncludeSignature(true)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">Yes, add my signature</div>
                            <div className={`w-4 h-4 rounded-full ${includeSignature === true ? 'bg-primary' : 'border border-gray-300'}`}></div>
                          </div>
                        </div>
                        <div 
                          className={`flex-1 p-4 rounded-lg border-2 cursor-pointer ${
                            includeSignature === false ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setIncludeSignature(false)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">No thanks 🙅‍♂️</div>
                            <div className={`w-4 h-4 rounded-full ${includeSignature === false ? 'bg-primary' : 'border border-gray-300'}`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Newsletter Name & Template Section */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Give your newsletter a name</h2>
                      <Input
                        value={newsletterName}
                        onChange={(e) => setNewsletterName(e.target.value)}
                        placeholder="Newsletter name"
                        className="max-w-lg"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Choose a visual style for your newsletter</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card
                          onClick={() => setSelectedTemplate('template1')}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                            selectedTemplate === 'template1' ? 'border-primary' : ''
                          }`}
                        >
                          <CardHeader className="p-0">
                            <img src="/placeholder.svg" alt="Template 1" className="w-full h-32 object-cover rounded-t-lg" />
                          </CardHeader>
                          <CardContent className="text-center p-3">
                            <p className="text-sm text-muted-foreground">Template 1</p>
                          </CardContent>
                        </Card>
                        <Card
                          onClick={() => setSelectedTemplate('template2')}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                            selectedTemplate === 'template2' ? 'border-primary' : ''
                          }`}
                        >
                          <CardHeader className="p-0">
                            <img src="/placeholder.svg" alt="Template 2" className="w-full h-32 object-cover rounded-t-lg" />
                          </CardHeader>
                          <CardContent className="text-center p-3">
                            <p className="text-sm text-muted-foreground">Template 2</p>
                          </CardContent>
                        </Card>
                        <Card
                          onClick={() => setSelectedTemplate('template3')}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 hover:scale-[1.02] ${
                            selectedTemplate === 'template3' ? 'border-primary' : ''
                          }`}
                        >
                          <CardHeader className="p-0">
                            <img src="/placeholder.svg" alt="Template 3" className="w-full h-32 object-cover rounded-t-lg" />
                          </CardHeader>
                          <CardContent className="text-center p-3">
                            <p className="text-sm text-muted-foreground">Template 3</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pricing summary */}
                  <div className="bg-amber-50 rounded-lg p-4 mt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Your subscription:</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedFrequency === 'weekly' 
                            ? 'Weekly Newsletter' 
                            : selectedFrequency === 'biweekly' 
                              ? 'Biweekly Newsletter' 
                              : 'Select a frequency'}
                        </p>
                      </div>
                      <div className="text-xl font-bold">
                        {selectedFrequency === 'weekly' 
                          ? '$10/month' 
                          : selectedFrequency === 'biweekly' 
                            ? '$19/month' 
                            : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="border-t p-6 flex justify-end">
              <Button
                onClick={handleCheckout}
                disabled={!isFormValid() || isSubmitting}
                className="bg-amber-500 text-white px-8 py-4 hover:bg-amber-600 h-auto"
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
