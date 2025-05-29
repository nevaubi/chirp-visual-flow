import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send, Copy, Check, Twitter, X, Mic } from 'lucide-react';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import TrendingTopicPill from '@/components/trends/TrendingTopicPill';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';

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
  isOpen?: boolean;
  onClose?: () => void;
}

const TweetGenerationPanel = ({ 
  onTopicSelect, 
  selectedTopic, 
  isOpen = false, 
  onClose 
}: TweetGenerationPanelProps) => {
  const { authState, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [generatedTweets, setGeneratedTweets] = useState<TweetVariation[]>([
    { text: '', charCount: 0 },
    { text: '', charCount: 0 },
    { text: '', charCount: 0 }
  ]);
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const hasVoiceProfile = authState.profile?.voice_profile_analysis !== null;
  
  const form = useForm({
    defaultValues: {
      prompt: '',
    },
  });

  // Set form value when selected topic changes
  useEffect(() => {
    if (selectedTopic && selectedTopic.header) {
      form.setValue('prompt', selectedTopic.header);
    }
  }, [selectedTopic, form]);

  // Focus the textarea when the panel is opened
  useEffect(() => {
    if (isOpen || isPanelOpen || isSheetOpen) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, isPanelOpen, isSheetOpen]);

  // Sync the local isPanelOpen state with the parent's isOpen prop
  useEffect(() => {
    if (!isMobile) {
      setIsPanelOpen(isOpen);
    } else {
      setIsSheetOpen(isOpen);
    }
  }, [isOpen, isMobile]);

  const handleRemoveTopic = () => {
    onTopicSelect(null);
    form.setValue('prompt', '');
    
    // Focus the textarea after a moment
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const handleCreateVoiceProfile = async () => {
    try {
      setIsCreatingProfile(true);
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
      setIsCreatingProfile(false);
    }
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
          className="min-h-24 resize-none border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none px-4 py-3"
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
      if (!isOpen) { // Only auto-close if not explicitly opened by parent
        setIsPanelOpen(false);
      }
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
  }, [isMobile, isOpen]);

  // Function to close the panel
  const handleClosePanel = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    } else {
      setIsPanelOpen(false);
    }
    
    if (onClose) {
      onClose();
    }
  };

  // Header component for the panel with improved voice profile button placement
  const PanelHeader = ({ showClose = false }) => (
    <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-8 relative">
      {showClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 text-white hover:bg-white/10"
          onClick={handleClosePanel}
        >
          <X size={18} />
        </Button>
      )}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-bold text-3xl">𝕏</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">X Post Generator</h3>
              <p className="text-gray-300 text-sm">Create posts in your authentic voice</p>
            </div>
          </div>
        </div>
        
        {!hasVoiceProfile && (
          <Button 
            size="default"
            onClick={handleCreateVoiceProfile}
            disabled={isCreatingProfile}
            className="bg-[#0087C8] hover:bg-[#0076b2] text-white w-full justify-center"
          >
            {isCreatingProfile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Voice Profile...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Create Voice Profile to Generate Posts
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  // Render mobile view using Sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="fixed top-20 right-4 z-50 rounded-md shadow-md hover:shadow-lg transition-all"
              onClick={() => setIsSheetOpen(true)}
            >
              <Twitter className="h-5 w-5 text-[#0087C8]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90%] sm:w-[375px] p-0 overflow-y-auto rounded-none">
            <PanelHeader showClose={true} />
            <div className="p-6 space-y-4">
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

                    {!hasVoiceProfile ? (
                      <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg mb-4">
                        <p className="text-sm text-amber-800">
                          A voice profile is required to generate posts in your authentic voice.
                        </p>
                      </div>
                    ) : null}

                    <Button 
                      type="submit" 
                      className={`w-full font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center ${
                        hasVoiceProfile 
                          ? "bg-blue-500 hover:bg-blue-600 text-white" 
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      disabled={isLoading || !hasVoiceProfile}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Generate Posts
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
      </>
    );
  }

  // Render desktop view with increased width
  return (
    <div 
      ref={panelRef}
      className={`fixed top-0 right-0 h-screen z-50 transform transition-all duration-300 ease-in-out ${
        isPanelOpen ? 'translate-x-0 shadow-xl' : 'translate-x-[calc(100%-14px)]'
      } bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col`}
    >
      {/* Handle for hover - increased width and height */}
      <div 
        className="w-6 h-20 absolute top-4 -left-6 bg-gradient-to-b from-[#0087C8] to-[#0076b2] rounded-l-lg flex items-center justify-center cursor-pointer shadow-lg border border-r-0 border-[#0087C8]/20 overflow-hidden group"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      >
        <div className="w-1 h-10 bg-white/80 rounded-full transition-all duration-200 group-hover:h-12 group-hover:bg-white"></div>
        {/* Enhanced glow effect overlay */}
        <div className="absolute inset-0 bg-white/0 animate-glow-pulse group-hover:bg-white/10 transition-all duration-200"></div>
      </div>

      <PanelHeader showClose={isOpen} />
      
      <div className="flex-1 w-[450px] max-h-full overflow-y-auto scrollbar-thin p-6 space-y-4 bg-gray-50">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateTweets)} className="space-y-4">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-3">
                  What would you like to post about?
                </label>
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
              </div>

              {!hasVoiceProfile ? (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg mb-4">
                  <p className="text-sm text-amber-800">
                    A voice profile is required to generate posts in your authentic voice.
                  </p>
                </div>
              ) : null}

              <Button 
                type="submit" 
                className={`w-full font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center ${
                  hasVoiceProfile 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={isLoading || !hasVoiceProfile}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Posts
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
        
        <h2 className="text-lg font-semibold text-gray-800 mt-2 mb-2">Generated Posts</h2>
        
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
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      {/* User info section - reduced height */}
      <div className="flex items-center space-x-2 mb-1.5">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
          {profile?.twitter_profilepic_url ? (
            <img 
              src={profile.twitter_profilepic_url} 
              alt={profile.twitter_username || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-gray-900 text-sm">{profile?.twitter_username || 'Your Name'}</span>
            {isVerified && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
            <Badge variant="outline" className="ml-1 text-xs font-normal px-1.5 py-0 rounded-full bg-gray-100 border-none text-gray-700">
              {index + 1}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">@{profile?.twitter_handle || 'yourusername'}</p>
        </div>
      </div>
      
      {/* Tweet content - reduced height */}
      <div className="mb-2">
        {tweet.text ? (
          <p className="text-sm text-gray-800 leading-normal">{tweet.text}</p>
        ) : (
          <div className="bg-gray-50 rounded-lg p-2 min-h-12 flex items-center justify-center text-gray-500 italic border-2 border-dashed border-gray-200 text-sm">
            Generated post content will appear here
          </div>
        )}
      </div>
      
      {/* Action buttons - reduced height */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{tweet.charCount} / 280</span>
        <button 
          className="flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-gray-100 transition-colors"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TweetGenerationPanel;
