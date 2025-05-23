
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
      const { data, error, status } = await supabase.functions.invoke("tweet-screenshot", {
        body: { tweetUrl: url, theme }
      });
      
      if (error) {
        // Check if it's a rate limit error based on status code
        if (status === 429) {
          throw new Error("Daily usage exceeded. Try again tomorrow.");
        }
        throw new Error(error.message);
      }
      
      // Check for error in the response
      if (data && data.error) {
        if (data.error_code === "RATE_LIMIT") {
          throw new Error("Daily usage exceeded. Try again tomorrow.");
        } else {
          throw new Error(data.message || data.error);
        }
      }
      
      // Store rate limit info if available
      if (data.rate_limit) {
        setRateLimit(data.rate_limit);
      }
      
      // Parse and clean the image data before storing it
      if (data.image) {
        const parsedImage = parseBase64Image(data.image);
        console.log("Parsed image data:", parsedImage ? "Data received" : "No data");
        if (!parsedImage) {
          throw new Error("Failed to parse image data from the response");
        }
        data.parsedImage = parsedImage;
        setTweetData(data);
      } else {
        throw new Error("No image data received from the API");
      }
    } catch (err: any) {
      console.error("Error generating screenshot:", err);
      
      // Customize the error message based on the error
      if (err.message?.includes("429") || 
          err.message?.includes("rate limit") || 
          err.message?.includes("Daily usage exceeded") ||
          (err.message?.includes("non-2xx status code") && rateLimit?.remaining === 0)) {
        setError("Daily usage exceeded. Try again tomorrow.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
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
