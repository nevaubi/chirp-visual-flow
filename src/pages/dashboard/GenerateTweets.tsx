
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TrendingTopics from '@/components/trends/TrendingTopics';

interface SelectedTopic {
  id: string;
  header: string;
  sentiment: string;
  context: string;
  subTopics: string[];
}

const GenerateTweets = () => {
  const { authState } = useAuth();
  const hasVoiceProfile = !!authState.profile?.voice_profile_analysis;

  return (
    <div className="space-y-6 relative">
      {hasVoiceProfile ? <TweetGenerationView /> : <CreateVoiceProfileView />}
    </div>
  );
};

const CreateVoiceProfileView = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Creating profile...');
  const { authState, refreshProfile } = useAuth();
  
  const handleCreateVoiceProfile = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Starting analysis...');
      
      toast({
        title: "Starting analysis",
        description: "We're analyzing your tweets to create your voice profile. This may take a few minutes.",
      });
      
      setLoadingMessage('Analyzing tweets...');
      const { data, error } = await supabase.functions.invoke('create-voice-profile', {
        body: { userId: authState.user?.id }
      });
      
      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(error.message || 'Failed to create voice profile');
      }
      
      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to create voice profile';
        console.error("Function returned error:", errorMsg);
        throw new Error(errorMsg);
      }
      
      setLoadingMessage('Finalizing profile...');
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
                <div className="h-4 w-4 text-amber-500"></div>
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
                  
                </div>
                <div>
                  <h4 className="text-sm font-medium">Fast & Effortless</h4>
                  <p className="text-xs text-gray-500">Takes just a few minutes to create your profile</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 bg-white rounded-lg border border-blue-100">
                <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  
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
            className="w-full sm:w-auto bg-[#0087C8] hover:bg-[#0076b2] rounded-md"
            onClick={handleCreateVoiceProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingMessage}
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

const TweetGenerationView = () => {
  // Handle topic selection by dispatching a custom event
  const handleSelectTopic = (topic: SelectedTopic) => {
    if (topic) {
      // Dispatch a custom event that will be caught by the DashboardLayout
      window.dispatchEvent(new CustomEvent('topicSelected', { detail: topic }));
    }
  };

  return (
    <div className="relative">
      {/* Main content - Trending Topics */}
      <div className="w-full">
        <TrendingTopics onSelectTopic={handleSelectTopic} />
      </div>
    </div>
  );
};

export default GenerateTweets;
