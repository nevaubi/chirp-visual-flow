
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { parseBase64Image } from "@/lib/utils";
import TweetScreenshotResult from "./TweetScreenshotResult";

type Theme = "light" | "dark";

const TweetScreenshot = () => {
  const [url, setUrl] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tweetData, setTweetData] = useState<any>(null);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; daily_limit: number } | null>(null);

  const validateUrl = (input: string): boolean => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return false;
    
    // Check if URL contains twitter.com or x.com and has status in it
    return (trimmedInput.includes('twitter.com') || trimmedInput.includes('x.com')) && 
           trimmedInput.includes('status/');
  };

  const handleGenerate = async () => {
    // Client-side validation
    if (!url.trim()) {
      setError("Please enter a tweet URL");
      return;
    }
    
    if (!validateUrl(url)) {
      setError("Please enter a valid Twitter/X URL (format: https://twitter.com/username/status/123456789)");
      return;
    }
    
    setLoading(true);
    setError(null);
    setTweetData(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("tweet-screenshot", {
        body: { tweetUrl: url, theme }
      });
      
      if (error) throw new Error(error.message);
      
      // Check for error in the response
      if (data && data.error) {
        throw new Error(data.message || data.error);
      }
      
      // Store rate limit info if available
      if (data.rate_limit) {
        setRateLimit(data.rate_limit);
      }
      
      // Parse and clean the image data before storing it
      if (data.image) {
        data.parsedImage = parseBase64Image(data.image);
        setTweetData(data);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Check if button should be disabled due to rate limit
  const isButtonDisabled = loading || (rateLimit && rateLimit.remaining <= 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Turn a tweet URL into a shareable screenshot image
      </p>
      
      {rateLimit && (
        <div className="text-sm px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
          {rateLimit.remaining > 0 ? (
            <p className="text-blue-700 dark:text-blue-300">
              {rateLimit.remaining} of {rateLimit.daily_limit} daily uses remaining
            </p>
          ) : (
            <p className="text-amber-700 dark:text-amber-300">
              No more uses left today. Try again tomorrow.
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="tweet-url">Tweet URL</Label>
          <Input
            id="tweet-url"
            placeholder="https://x.com/username/status/123456789"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={error ? "border-red-300" : ""}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        
        <div>
          <Label>Theme</Label>
          <RadioGroup 
            value={theme} 
            onValueChange={(value) => setTheme(value as Theme)}
            className="flex gap-4 mt-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="cursor-pointer">Light</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      
      <Button 
        onClick={handleGenerate} 
        disabled={isButtonDisabled}
        className="w-full"
      >
        {loading ? "Generating..." : isButtonDisabled ? "Daily Limit Reached" : "Generate Screenshot"}
      </Button>
      
      {loading && (
        <div className="space-y-4 animate-pulse">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <div className="flex justify-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}
      
      {tweetData && tweetData.parsedImage && (
        <TweetScreenshotResult image={tweetData.parsedImage} />
      )}
    </div>
  );
};

export default TweetScreenshot;
