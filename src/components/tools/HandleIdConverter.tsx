import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const HandleIdConverter = () => {
  const [handle, setHandle] = useState("");
  const [id, setId] = useState("");
  const handleConvert = () => {
    // TODO: implement conversion logic
    alert("Conversion not implemented");
  };

  return (
    <Tabs defaultValue="handle2id" className="w-full">
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
          />
          <Button onClick={handleConvert} className="whitespace-nowrap">
            Convert
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
          />
          <Button onClick={handleConvert} className="whitespace-nowrap">
            Convert
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default HandleIdConverter;
