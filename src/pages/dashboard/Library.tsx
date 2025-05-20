
import { useEffect, useState } from "react";
import { Book } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Define the newsletter structure
interface Newsletter {
  id: string;
  created_at: string;
  markdown_text: string | null;
}

const Library = () => {
  const { authState } = useAuth();

  // Fetch newsletters from Supabase
  const { data: newsletters, isLoading, error } = useQuery({
    queryKey: ["newsletters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_storage")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      return data as Newsletter[];
    },
    enabled: !!authState.user,
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Create a truncated preview of the newsletter content
  const createPreview = (markdown: string | null) => {
    if (!markdown) return "No content available";
    
    // Remove markdown formatting and truncate
    const plainText = markdown
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italics
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '[Image]'); // Replace images
    
    return plainText.length > 150 
      ? plainText.substring(0, 150) + '...' 
      : plainText;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Book className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Newsletter Library</h1>
      </div>
      
      {isLoading ? (
        // Loading state with skeleton cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter className="bg-muted/50 px-6 py-3">
                <Skeleton className="h-4 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>Unable to load newsletters: {error.message}</p>
        </div>
      ) : !newsletters || newsletters.length === 0 ? (
        // Empty state
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <Book className="h-10 w-10 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No newsletters yet</h3>
          <p className="text-gray-500">Generated newsletters will appear here.</p>
        </div>
      ) : (
        // Display newsletters in grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsletters.map((newsletter) => (
            <Card key={newsletter.id} className="overflow-hidden h-full flex flex-col">
              <CardContent className="p-6 flex-grow">
                <div className="text-sm text-muted-foreground mb-2">
                  {formatDate(newsletter.created_at)}
                </div>
                <div className="text-sm line-clamp-6">
                  {createPreview(newsletter.markdown_text)}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 px-6 py-3 text-xs text-muted-foreground">
                Newsletter #{newsletter.id.substring(0, 8)}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
