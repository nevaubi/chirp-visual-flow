import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Tweet {
  id: string;
  text: string;
}

const tweetStyles = [
  "Informative",
  "Funny",
  "Controversial",
  "Engaging",
  "Personal",
  "Storytelling",
  "Listicle",
  "Question",
  "Bold",
  "Witty",
  "Sarcastic",
  "Positive",
  "Negative",
  "Neutral",
  "Empathic",
  "Curious",
  "Helpful",
  "Inspirational",
  "Provocative",
  "Analytical",
  "Creative",
  "Educational",
  "Opinionated",
  "Reflective",
  "Sincere",
  "Surprising",
  "Thoughtful",
  "Unique",
  "Vulnerable"
];

const TweetGenerationPanel = () => {
  const { authState } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [tweetCount, setTweetCount] = useState(3);
  const [selectedStyle, setSelectedStyle] = useState('Informative');
  const [generatedTweets, setGeneratedTweets] = useState<Tweet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copiedTweetId, setCopiedTweetId] = useState<string | null>(null);

  const generateTweets = async () => {
    if (!authState.user) {
      toast.error("Please log in to generate tweets");
      return;
    }

    if (!selectedTopic && !customTopic.trim()) {
      toast.error("Please select a topic or enter a custom topic");
      return;
    }

    const topicToUse = selectedTopic || customTopic.trim();
    setIsGenerating(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-tweets', {
        body: {
          topic: topicToUse,
          count: tweetCount,
          style: selectedStyle
        }
      });

      if (error) {
        throw error;
      }

      if (data?.tweets) {
        setGeneratedTweets(data.tweets);
        toast.success(`Generated ${data.tweets.length} tweets successfully!`);
      } else {
        throw new Error('No tweets returned from the API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tweets';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (tweetId: string, tweetText: string) => {
    navigator.clipboard.writeText(tweetText)
      .then(() => {
        setCopiedTweetId(tweetId);
        toast.success("Tweet copied to clipboard!");
        setTimeout(() => {
          setCopiedTweetId(null);
        }, 2000);
      })
      .catch(err => {
        console.error("Failed to copy tweet: ", err);
        toast.error("Failed to copy tweet to clipboard.");
      });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tweet Generator</CardTitle>
        <CardDescription>Generate engaging tweets with AI</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            placeholder="Enter a topic"
            value={customTopic}
            onChange={(e) => {
              setCustomTopic(e.target.value);
              setSelectedTopic('');
            }}
          />
          <Separator className="my-2" />
          <Label>Or select a popular topic</Label>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTopic === 'Technology' ? 'secondary' : 'outline'}
              onClick={() => {
                setSelectedTopic('Technology');
                setCustomTopic('');
              }}
              className="cursor-pointer"
            >
              Technology
            </Badge>
            <Badge
              variant={selectedTopic === 'AI' ? 'secondary' : 'outline'}
              onClick={() => {
                setSelectedTopic('AI');
                setCustomTopic('');
              }}
              className="cursor-pointer"
            >
              AI
            </Badge>
            <Badge
              variant={selectedTopic === 'Web Development' ? 'secondary' : 'outline'}
              onClick={() => {
                setSelectedTopic('Web Development');
                setCustomTopic('');
              }}
              className="cursor-pointer"
            >
              Web Development
            </Badge>
            <Badge
              variant={selectedTopic === 'Marketing' ? 'secondary' : 'outline'}
              onClick={() => {
                setSelectedTopic('Marketing');
                setCustomTopic('');
              }}
              className="cursor-pointer"
            >
              Marketing
            </Badge>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="count">Number of Tweets</Label>
          <Select value={tweetCount.toString()} onValueChange={(value) => setTweetCount(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select tweet count" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="style">Style</Label>
          <Select value={selectedStyle} onValueChange={setSelectedStyle}>
            <SelectTrigger>
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-auto">
              {tweetStyles.map(style => (
                <SelectItem key={style} value={style}>{style}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={generateTweets} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Tweets'}
        </Button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </CardFooter>

      {generatedTweets.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Generated Tweets</h3>
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-3">
              {generatedTweets.map((tweet) => (
                <div key={tweet.id} className="border rounded-md p-3 relative">
                  <Textarea
                    readOnly
                    value={tweet.text}
                    className="resize-none w-full bg-transparent border-none shadow-none focus-visible:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopyToClipboard(tweet.id, tweet.text)}
                  >
                    {copiedTweetId === tweet.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
};

export default TweetGenerationPanel;
