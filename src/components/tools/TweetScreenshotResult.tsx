
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";

interface TweetScreenshotResultProps {
  image: string;
}

const TweetScreenshotResult = ({ image }: TweetScreenshotResultProps) => {
  const [copied, setCopied] = useState(false);

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = image;
    link.download = `tweet-screenshot-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImage = async () => {
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden shadow-sm mx-auto max-w-[540px] scale-75 origin-top">
        <img 
          src={image} 
          alt="Tweet Screenshot" 
          className="w-full h-auto"
        />
      </div>
      
      <div className="flex justify-center gap-3">
        <Button onClick={downloadImage} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button 
          onClick={copyImage} 
          variant={copied ? "outline" : "secondary"}
          className="gap-2"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied!" : "Copy Image"}
        </Button>
      </div>
    </div>
  );
};

export default TweetScreenshotResult;
