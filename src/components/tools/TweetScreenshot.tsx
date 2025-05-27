import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TweetScreenshotResult {
  screenshotUrl: string;
  tweetData: any;
}

const TweetScreenshotTool = () => {
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TweetScreenshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!url.trim()) {
      setError('Please enter a valid X/Twitter URL');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('tweet-screenshot', {
        body: { url: url.trim() }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate screenshot');
      }

      if (data?.success && data?.screenshotUrl) {
        setResult({
          screenshotUrl: data.screenshotUrl,
          tweetData: data.tweetData
        });
      } else {
        throw new Error(data?.error || 'Failed to generate screenshot');
      }
    } catch (err) {
      console.error('Screenshot generation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Tweet Screenshot</CardTitle>
          <CardDescription>Enter the URL of the X/Twitter tweet to generate a screenshot.</CardDescription>
        </CardHeader>
        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              type="url"
              placeholder="Enter X/Twitter URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isGenerating}
            />
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  Generating...
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </div>
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Screenshot Result</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-4">
            <img src={result.screenshotUrl} alt="Tweet Screenshot" className="rounded-md" />
            <Button variant="outline" onClick={handleReset}>
              <X className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TweetScreenshotTool;
