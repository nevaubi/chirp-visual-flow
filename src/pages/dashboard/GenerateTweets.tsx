import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, Send, Twitter, Sparkles, Zap, FileText, Copy, Check, BadgeCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import TrendingTopics from '@/components/trends/TrendingTopics';
import TrendingTopicPill from '@/components/trends/TrendingTopicPill';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const GenerateTweets = () => {
  const { authState } = useAuth();
  const { profile } = authState;
  const hasVoiceProfile = profile?.voice_profile_analysis !== null;

  return (
    <div className="space-y-6">
      {!hasVoiceProfile ? (
        <CreateVoiceProfileView />
      ) : (
        <TweetGenerationView />
      )}
    </div>
  );
};

const CreateVoiceProfileView = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { authState, refreshProfile } = useAuth();
  
  const handleCreateVoiceProfile = async () => {
    try {
      setIsLoading(true);
      toast({
        title: "Starting analysis",
        description: "We're analyzing your tweets to create your voice profile. This may take a few minutes.",
      });
      
      const { data, error } = await supabase.functions.invoke('create-voice-profile', {
        body: { userId: authState.user?.id }
      });
      
      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(error.message || 'Failed to create voice profile');
      }
      
      if (!data.success) {
        console.error("Function returned error:", data.error);
        throw new Error(data.error || 'Failed to create voice profile');
      }
      
      toast({
        title: "Voice profile created!",
        description: "Your voice profile has been successfully created. You can now generate tweets.",
      });
      
      // Refresh user profile to get updated voice_profile_analysis
      await refreshProfile();
      
    } catch (error: any) {
      console.error("Error creating voice profile:", error);
      toast({
        title: "Error creating voice profile",
        description: error.message || "Something went wrong. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            Create Your Voice Profile
          </CardTitle>
          <CardDescription className="text-blue-700">
            Generate tweets that perfectly match your writing style and tone
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                What is a Voice Profile?
              </h3>
              <p className="text-sm text-gray-600">
                A voice profile analyzes your existing tweets to learn your unique writing style, 
                tone, and patterns. This allows the AI to generate new tweets that sound authentically 
                like you.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex gap-3 p-3 bg-white rounded-lg border border-blue-100">
                <div className="flex-shrink-0 h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Fast & Effortless</h4>
                  <p className="text-xs text-gray-500">Takes just a few minutes to create your profile</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 bg-white rounded-lg border border-blue-100">
                <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Authentic Content</h4>
                  <p className="text-xs text-gray-500">Generated tweets match your authentic voice</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full sm:w-auto bg-[#0087C8] hover:bg-[#0076b2]"
            onClick={handleCreateVoiceProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Create Voice Profile
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">1</div>
              <div>
                <h4 className="text-sm font-medium">Create profile</h4>
                <p className="text-xs text-gray-500">We'll analyze your past tweets to understand your voice</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">2</div>
              <div>
                <h4 className="text-sm font-medium">Select topics</h4>
                <p className="text-xs text-gray-500">Choose what you want to tweet about</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">3</div>
              <div>
                <h4 className="text-sm font-medium">Generate tweets</h4>
                <p className="text-xs text-gray-500">Get tweets that sound just like you wrote them</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface TweetVariation {
  text: string;
  charCount: number;
}

interface SelectedTopic {
  id: string;
  header: string;
  sentiment: string;
  context: string;
  subTopics: string[];
  exampleTweets: string[];
}

const TweetGenerationView = () => {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTweets, setGeneratedTweets] = useState<TweetVariation[]>([
    { text: '', charCount: 0 },
    { text: '', charCount: 0 },
    { text: '', charCount: 0 }
  ]);
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const form = useForm({
    defaultValues: {
      prompt: '',
    },
  });

  const handleGenerateTweets = async (values: { prompt: string }) => {
    try {
      // Use either the user-provided prompt or the selected topic header as fallback
      const promptText = values.prompt || (selectedTopic ? selectedTopic.header : '');
      
      // If there's still no prompt, show an error and return early
      if (!promptText) {
        toast({
          title: "Missing prompt",
          description: "Please enter a prompt or select a trending topic",
          variant: "destructive"
        });
        return;
      }
      
      setIsLoading(true);
      
      const requestBody: any = {
        prompt: promptText,
        userId: authState.user?.id
      };
      
      // Add selected topic metadata if available
      if (selectedTopic) {
        requestBody.selectedTopics = [{
          header: selectedTopic.header,
          sentiment: selectedTopic.sentiment,
          context: selectedTopic.context,
          subTopics: selectedTopic.subTopics,
          exampleTweets: selectedTopic.exampleTweets
        }];
      }
      
      console.log('Generating tweets with prompt:', promptText);
      console.log('Request body:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('generate-tweets', {
        body: requestBody
      });
      
      if (error) {
        console.error("Error invoking function:", error);
        throw new Error(error.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate tweets');
      }

      // Format the tweets with character count
      const formattedTweets = data.tweets.map((tweet: string) => ({
        text: tweet,
        charCount: tweet.length
      }));
      
      setGeneratedTweets(formattedTweets);
      
    } catch (error: any) {
      console.error("Error generating tweets:", error);
      toast({
        title: "Error generating tweets",
        description: error.message || "Something went wrong. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicSelect = (topicData: any) => {
    setSelectedTopic({
      id: topicData.id,
      header: topicData.header,
      sentiment: topicData.sentiment,
      context: topicData.context,
      subTopics: topicData.subTopics || [],
      exampleTweets: topicData.exampleTweets || []
    });
    
    // Update the prompt field with the topic header
    form.setValue('prompt', topicData.header);
    
    // Focus the textarea after a moment to ensure UI is updated
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
    
    toast({
      title: "Topic selected",
      description: `Added "${topicData.header}" to your prompt`,
    });
  };

  const handleRemoveTopic = () => {
    setSelectedTopic(null);
    
    // Focus the textarea after a moment
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  // Custom render for the textarea with pill
  const CustomTextarea = ({ field }: { field: any }) => {
    return (
      <div className="relative">
        {selectedTopic && (
          <div className="mb-2">
            <TrendingTopicPill 
              header={selectedTopic.header} 
              onRemove={handleRemoveTopic}
            />
          </div>
        )}
        <Textarea
          {...field}
          ref={textareaRef}
          placeholder={selectedTopic 
            ? "Add any additional details to your prompt..."
            : "What would you like to tweet about?"
          }
          className="min-h-24 resize-none"
        />
      </div>
    );
  };

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-2 gap-8'}`}>
      {/* Left column - Tweet generation (now as a grid) */}
      <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-2 gap-4 auto-rows-min'}`}>
        {/* Input form - top left */}
        <Card className="h-full">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateTweets)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CustomTextarea field={field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-[#0087C8] hover:bg-[#0076b2]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Generate Tweets
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
            
        {/* Tweet variations - distributed in the remaining grid cells */}
        {generatedTweets.map((tweet, index) => (
          <TwitterCard 
            key={index} 
            tweet={tweet} 
            profile={authState.profile} 
            index={index} 
          />
        ))}
      </div>

      {/* Right column - Trending Topics */}
      <div className={isMobile ? 'mt-6' : ''}>
        <TrendingTopics onSelectTopic={handleTopicSelect} />
      </div>
    </div>
  );
};

interface TwitterCardProps {
  tweet: TweetVariation;
  profile: any;
  index: number;
}

const TwitterCard = ({ tweet, profile, index }: TwitterCardProps) => {
  const [copied, setCopied] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const isVerified = profile?.is_verified || false; // Add verification check

  // Set isNew to false after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNew(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tweet.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Tweet copied!",
      description: "Tweet text copied to clipboard",
    });
  };

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm hover-lift transition-all duration-300">
      {/* User info section */}
      <div className="p-4 flex items-center space-x-3 border-b border-gray-100">
        <Avatar className="h-12 w-12">
          {profile?.twitter_profilepic_url ? (
            <AvatarImage 
              src={profile.twitter_profilepic_url} 
              alt={profile.twitter_username || 'Profile'} 
            />
          ) : (
            <AvatarFallback className="bg-gray-100">
              <Twitter className="w-5 h-5 text-gray-500" />
            </AvatarFallback>
          )}
        </Avatar>
        
        <div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-gray-900">{profile?.twitter_username || 'Your Name'}</span>
            {/* Add blue checkmark icon */}
            <BadgeCheck className="h-4 w-4 text-[#1DA1F2]" />
            <Badge variant="outline" className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 border-none text-gray-700">
              Option {index + 1}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">@{profile?.twitter_handle || 'yourusername'}</p>
        </div>
      </div>
      
      {/* Tweet content */}
      <div className={`p-4 min-h-[100px] flex items-center ${isNew ? 'animate-fade-in' : ''}`}>
        {tweet.text ? (
          <p className="text-gray-800 text-lg leading-relaxed">{tweet.text}</p>
        ) : (
          <div className="w-full text-center text-gray-400 italic">
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {tweet.charCount} / 280 characters
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-gray-700 rounded-full hover:bg-gray-100 flex items-center gap-1.5"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy text
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default GenerateTweets;
