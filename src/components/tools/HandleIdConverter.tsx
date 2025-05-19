
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Check, Copy, AlertCircle, Loader2, 
  BadgeCheck, User, CornerUpRight 
} from "lucide-react";

interface UserData {
  rest_id: string;
  is_blue_verified: boolean;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
}

const HandleIdConverter = () => {
  const [handle, setHandle] = useState("");
  const [id, setId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [activeTab, setActiveTab] = useState("handle2id");
  const { toast } = useToast();

  const resetStates = () => {
    setError("");
    setUserData(null);
    setCopiedId(false);
    setCopiedHandle(false);
  };

  const handleCopy = (text: string, type: 'id' | 'handle') => {
    navigator.clipboard.writeText(text);
    
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast({
        title: "ID copied!",
        description: "The ID has been copied to your clipboard."
      });
    } else {
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 2000);
      toast({
        title: "Handle copied!",
        description: "The handle has been copied to your clipboard."
      });
    }
  };

  const handleConvert = async () => {
    resetStates();
    setIsLoading(true);

    try {
      let payload = {};
      let functionName = "";
      
      if (activeTab === "handle2id") {
        if (!handle.trim()) {
          setError("Please enter a valid X handle");
          setIsLoading(false);
          return;
        }
        payload = { handle, conversionType: "handle2id" };
        functionName = "twitter-handle-to-id";
      } else {
        if (!id.trim()) {
          setError("Please enter a valid user ID");
          setIsLoading(false);
          return;
        }
        payload = { id };
        functionName = "id-to-twitter-handle";
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        functionName,
        { body: payload }
      );

      if (functionError) {
        setError(functionError.message);
        return;
      }

      if (data.error) {
        setError(data.message || "An error occurred");
        return;
      }

      setUserData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetStates();
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-2 mb-4">
        <TabsTrigger value="handle2id" className="w-full">
          X handle -&gt; ID
        </TabsTrigger>
        <TabsTrigger value="id2handle" className="w-full">
          User ID -&gt; handle
        </TabsTrigger>
      </TabsList>

      <TabsContent value="handle2id">
        <p className="text-sm text-muted-foreground mb-4">
          Get any user's numerical ID instantly
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="@username"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            onClick={handleConvert} 
            className="whitespace-nowrap"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Converting...
              </>
            ) : (
              'Convert'
            )}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="id2handle">
        <p className="text-sm text-muted-foreground mb-4">
          Get the username handle from any numerical ID
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="1234567890"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            onClick={handleConvert} 
            className="whitespace-nowrap"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Converting...
              </>
            ) : (
              'Convert'
            )}
          </Button>
        </div>
      </TabsContent>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {userData && (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
          <div className="flex items-center mb-4">
            <img 
              src={userData.profile_image_url_https} 
              alt={userData.name}
              className="w-12 h-12 rounded-full mr-3"
            />
            <div>
              <div className="flex items-center">
                <h3 className="font-medium">{userData.name}</h3>
                {userData.is_blue_verified && (
                  <BadgeCheck className="h-4 w-4 text-blue-500 ml-1" />
                )}
              </div>
              <p className="text-gray-500">@{userData.screen_name}</p>
            </div>
          </div>
          
          {activeTab === "handle2id" ? (
            <div className="flex items-center justify-between p-2.5 bg-white border rounded-md">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-500 mr-2" />
                <span className="font-mono">{userData.rest_id}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleCopy(userData.rest_id, 'id')}
              >
                {copiedId ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2.5 bg-white border rounded-md">
              <div className="flex items-center">
                <CornerUpRight className="h-4 w-4 text-gray-500 mr-2" />
                <span>@{userData.screen_name}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleCopy(`@${userData.screen_name}`, 'handle')}
              >
                {copiedHandle ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Tabs>
  );
};

export default HandleIdConverter;
