import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TweetScreenshot = () => {
  const [url, setUrl] = useState("");
  const handleGenerate = () => {
    // TODO: implement screenshot logic
    alert("Screenshot generation not implemented");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Turn a tweet URL into a shareable screenshot image
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="https://x.com/tweet"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={handleGenerate} className="whitespace-nowrap">
          Generate
        </Button>
      </div>
    </div>
  );
};

export default TweetScreenshot;
