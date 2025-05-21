
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send, Copy, Check } from 'lucide-react';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Badge as BadgeIcon } from 'lucide-react';
import TrendingTopicPill from '@/components/trends/TrendingTopicPill';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Twitter } from 'lucide-react';

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

interface TweetGenerationPanelProps {
  onTopicSelect: (topic: any) => void;
  selectedTopic: SelectedTopic | null;
}

const TweetGenerationPanel = ({ onTopicSelect, selectedTopic }: TweetGenerationPanelProps) => {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTweets, setGeneratedTweets] = useState<TweetVariation[]>([
    { text: '', charCount: 0 },
    { text: '', charCount: 0 },
    { text: '', charCount: 0 }
  ]);
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const form = useForm({
    defaultValues: {
      prompt: '',
    },
  });

  const handleRemoveTopic = () => {
    onTopicSelect(null);
    
    // Focus the textarea after a moment
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

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

  // Handle hover events for desktop
  useEffect(() => {
    if (isMobile) return;

    const handleMouseEnter = () => {
      setIsPanelOpen(true);
    };

    const handleMouseLeave = () => {
      setIsPanelOpen(false);
    };

    const panelElement = panelRef.current;
    if (panelElement) {
      panelElement.addEventListener('mouseenter', handleMouseEnter);
      panelElement.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (panelElement) {
        panelElement.removeEventListener('mouseenter', handleMouseEnter);
        panelElement.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isMobile, panelRef]);

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-20 right-4 z-50 rounded-full">
            <Twitter className="h-5 w-5 text-[#0087C8]" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90%] sm:w-[375px] p-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 pb-4">
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
            </div>
            
            <div className="space-y-4">
              {generatedTweets.map((tweet, index) => (
                <TwitterCard 
                  key={index} 
                  tweet={tweet} 
                  profile={authState.profile} 
                  index={index} 
                />
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div 
      ref={panelRef}
      className={`fixed top-16 right-0 h-[calc(100vh-64px)] z-40 transform transition-all duration-300 ease-in-out ${
        isPanelOpen ? 'translate-x-0 shadow-xl' : 'translate-x-[calc(100%-24px)]'
      } bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex`}
    >
      {/* Handle for hover */}
      <div 
        className="w-6 h-20 absolute top-1/2 -translate-y-1/2 -left-6 bg-[#0087C8] rounded-l-lg flex items-center justify-center cursor-pointer"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      >
        <div className="w-1 h-8 bg-white/60 rounded-full"></div>
      </div>
      
      <div className={`w-[340px] max-h-full overflow-y-auto scrollbar-thin p-4 space-y-4`}>
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
        
        <div className="space-y-4">
          {generatedTweets.map((tweet, index) => (
            <TwitterCard 
              key={index} 
              tweet={tweet} 
              profile={authState.profile} 
              index={index} 
            />
          ))}
        </div>
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
  const isVerified = profile?.is_verified || false;

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
      <div className="p-3 flex items-center space-x-3 border-b border-gray-100">
        <Avatar className="h-10 w-10">
          {profile?.twitter_profilepic_url ? (
            <AvatarImage 
              src={profile.twitter_profilepic_url} 
              alt={profile.twitter_username || 'Profile'} 
            />
          ) : (
            <AvatarFallback className="bg-gray-100">
              <Twitter className="w-4 h-4 text-gray-500" />
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 text-sm">{profile?.twitter_username || 'Your Name'}</span>
            <BadgeIcon className="h-3.5 w-3.5 text-[#1DA1F2]" />
            <Badge variant="outline" className="ml-1 text-xs font-normal px-1.5 py-0 rounded-full bg-gray-100 border-none text-gray-700">
              {index + 1}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">@{profile?.twitter_handle || 'yourusername'}</p>
        </div>
      </div>
      
      {/* Tweet content */}
      <div className={`p-3 min-h-[90px] flex items-start ${isNew ? 'animate-fade-in' : ''}`}>
        {tweet.text ? (
          <p className="text-base text-gray-800 leading-normal">{tweet.text}</p>
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
      <div className="px-3 py-2 border-t border-gray-100 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {tweet.charCount} / 280
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs text-gray-700 rounded-full h-7 hover:bg-gray-100 flex items-center gap-1"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default TweetGenerationPanel;
