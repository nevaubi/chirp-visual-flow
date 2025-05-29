import { useEffect, useState } from "react";
import { FileText, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { marked } from "marked";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, isWithinInterval, subDays, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

// Define the newsletter structure
interface Newsletter {
  id: string;
  created_at: string;
  markdown_text: string | null;
}

// Content parsing utility functions
const extractTitle = (markdown: string | null): string => {
  if (!markdown) return "Newsletter";
  
  // Look for first heading (# Title)
  const headingMatch = markdown.match(/^#+\s*(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  
  // Fallback to first line of substantial text
  const lines = markdown.split('\n').filter(line => line.trim().length > 0);
  const firstTextLine = lines.find(line => 
    !line.startsWith('#') && 
    !line.startsWith('![') && 
    !line.startsWith('*') &&
    !line.startsWith('-') &&
    line.trim().length > 10
  );
  
  return firstTextLine ? truncateText(firstTextLine.trim(), 50) : "Newsletter";
};

const extractFirstImage = (markdown: string | null): string | null => {
  if (!markdown) return null;
  
  // Look for markdown image syntax ![alt](url)
  const imageMatch = markdown.match(/!\[.*?\]\((.*?)\)/);
  if (imageMatch) {
    return imageMatch[1];
  }
  
  // Look for direct image URLs
  const urlMatch = markdown.match(/(https?:\/\/.*?\.(jpg|jpeg|png|gif|webp))/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  return null;
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

const Library = () => {
  const { authState } = useAuth();
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 6), // Past 7 days (including today)
    end: new Date()
  });

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

  // Filter newsletters by date range
  const filteredNewsletters = newsletters?.filter(newsletter => {
    const newsletterDate = new Date(newsletter.created_at);
    return isWithinInterval(newsletterDate, dateRange);
  }) || [];

  // Group newsletters by date
  const groupedNewsletters = filteredNewsletters.reduce((groups, newsletter) => {
    const date = format(new Date(newsletter.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(newsletter);
    return groups;
  }, {} as Record<string, Newsletter[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedNewsletters).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Handle date selection for week view
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday end
    
    setSelectedDate(date);
    setDateRange({ start: weekStart, end: weekEnd });
  };

  // Navigate to previous/next week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 7) 
      : addDays(selectedDate, 7);
    handleDateSelect(newDate);
  };

  // Quick date range buttons
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days - 1);
    setDateRange({ start, end });
    setSelectedDate(end);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date for group headers
  const formatGroupDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isSameDay(date, subDays(today, 1))) {
      return 'Yesterday';
    }
    
    return format(date, 'EEEE, MMMM d');
  };

  // Format short date for the card
  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render markdown to HTML
  const renderMarkdown = (markdown: string | null) => {
    if (!markdown) return "<p>No content available</p>";
    
    try {
      return marked.parse(markdown);
    } catch (err) {
      console.error("Error rendering markdown:", err);
      return "<p>Error rendering content</p>";
    }
  };

  // View newsletter in dialog
  const viewNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Newsletter Library</h1>
        </div>
        
        {/* Date Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Range Buttons */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(7)}
              className={cn(
                dateRange.start.getTime() === subDays(new Date(), 6).getTime() && 
                dateRange.end.getTime() === new Date().getTime() && "bg-primary/10"
              )}
            >
              7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(30)}
            >
              30 days
            </Button>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[140px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(selectedDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="text-sm text-muted-foreground">
        Showing newsletters from {format(dateRange.start, 'MMM d')} to {format(dateRange.end, 'MMM d, yyyy')}
      </div>
      
      {isLoading ? (
        // Loading state with skeleton cards
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow">
              <AspectRatio ratio={4/3}>
                <div className="flex flex-col h-full p-3">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-16 w-full mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </AspectRatio>
            </Card>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          <p>Unable to load newsletters: {error.message}</p>
        </div>
      ) : filteredNewsletters.length === 0 ? (
        // Empty state
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">
            No newsletters found for this period
          </h3>
          <p className="text-gray-500">
            Try selecting a different date range or generate some newsletters.
          </p>
        </div>
      ) : (
        // Display newsletters grouped by date
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                {formatGroupDate(date)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {groupedNewsletters[date].map((newsletter) => {
                  const title = extractTitle(newsletter.markdown_text);
                  const firstImage = extractFirstImage(newsletter.markdown_text);
                  
                  return (
                    <Card 
                      key={newsletter.id} 
                      className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/20 group"
                      onClick={() => viewNewsletter(newsletter)}
                    >
                      <AspectRatio ratio={4/3}>
                        <div className="flex flex-col h-full">
                          {/* Date Badge */}
                          <div className="absolute top-2 right-2 z-10">
                            <span className="text-xs font-medium bg-primary/90 text-primary-foreground px-2 py-1 rounded-md shadow-sm">
                              {formatShortDate(newsletter.created_at)}
                            </span>
                          </div>
                          
                          {/* Image/Icon Section */}
                          <div className="flex-none h-16 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative overflow-hidden">
                            {firstImage ? (
                              <img 
                                src={firstImage} 
                                alt="Newsletter preview" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling!.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`${firstImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                              <FileText className="h-8 w-8 text-primary/60" />
                            </div>
                          </div>
                          
                          {/* Content Section */}
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">
                                {title}
                              </h3>
                              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                Newsletter content from {format(new Date(newsletter.created_at), 'MMM d')}
                              </p>
                            </div>
                            
                            {/* Bottom indicator */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                <span className="text-xs text-gray-400 font-medium">Newsletter</span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-1 h-1 bg-primary rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AspectRatio>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Newsletter Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedNewsletter && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Newsletter from {formatDate(selectedNewsletter.created_at)}</DialogTitle>
                <DialogDescription>
                  Generated on {new Date(selectedNewsletter.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div 
                className="prose dark:prose-invert max-w-none my-4" 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNewsletter.markdown_text) }}
              />
              
              <DialogFooter className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNewsletter.markdown_text || "")
                      .then(() => toast.success("Newsletter content copied to clipboard"))
                      .catch(() => toast.error("Failed to copy to clipboard"));
                  }}
                >
                  Copy Content
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;
