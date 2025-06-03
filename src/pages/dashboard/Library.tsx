import { useEffect, useState } from "react";
import { FileText, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download } from "lucide-react";
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
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";

// Define the newsletter structure
interface Newsletter {
  id: string;
  created_at: string;
  markdown_text: string | null;
}

// HTML cleaning utility function
const stripHtmlTags = (text: string): string => {
  if (!text) return '';
  
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

// Enhanced content parsing utility functions
const extractTitle = (markdown: string | null): string => {
  if (!markdown) return "Newsletter";
  
  // Sanitize the markdown first
  const sanitizedMarkdown = DOMPurify.sanitize(markdown, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
  
  // Look for first heading (# Title) and clean it
  const headingMatch = sanitizedMarkdown.match(/^#+\s*(.+)$/m);
  if (headingMatch) {
    const cleanTitle = stripHtmlTags(headingMatch[1].trim());
    return cleanTitle || "Newsletter";
  }
  
  // Fallback to first line of substantial text, but be smarter about it
  const lines = sanitizedMarkdown.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    // Skip lines that are mostly HTML or markdown syntax
    if (line.startsWith('#') || 
        line.startsWith('![') || 
        line.startsWith('*') ||
        line.startsWith('-') ||
        line.match(/^<[^>]+>.*<\/[^>]+>$/)) {
      continue;
    }
    
    // Clean the line and check if it has substantial text
    const cleanedLine = stripHtmlTags(line.trim());
    
    // Only use lines with substantial content (more than 10 characters after cleaning)
    if (cleanedLine.length > 10) {
      return truncateText(cleanedLine, 50);
    }
  }
  
  return "Newsletter";
};

const extractFirstImage = (markdown: string | null): string | null => {
  if (!markdown) return null;
  
  // Sanitize markdown first
  const sanitizedMarkdown = DOMPurify.sanitize(markdown, {
    ALLOWED_TAGS: ['img'],
    ALLOWED_ATTR: ['src', 'alt']
  });
  
  // Look for markdown image syntax ![alt](url)
  const imageMatch = sanitizedMarkdown.match(/!\[.*?\]\((.*?)\)/);
  if (imageMatch) {
    return imageMatch[1];
  }
  
  // Look for direct image URLs
  const urlMatch = sanitizedMarkdown.match(/(https?:\/\/.*?\.(jpg|jpeg|png|gif|webp))/i);
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
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

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

  // Secure markdown to HTML renderer with sanitization
  const renderMarkdown = (markdown: string | null) => {
    if (!markdown) return "<p>No content available</p>";
    
    try {
      // Use the synchronous version of marked.parse
      const html = marked.parse(markdown, { async: false }) as string;
      
      // Then sanitize with DOMPurify to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 'strike',
          'ul', 'ol', 'li', 'blockquote',
          'a', 'img', 'code', 'pre',
          'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'width', 'height', 'class'],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
      
      return sanitizedHtml;
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

  const downloadAsPDF = async () => {
    if (!selectedNewsletter) return;

    setIsPdfGenerating(true);

    try {
      const element = document.getElementById("newsletter-content");
      if (!element) throw new Error("Newsletter content not found");

      const rect       = element.getBoundingClientRect();
      const widthPx    = rect.width;
      const heightPx   = rect.height;
      const pxToMm     = (px: number) => px * 0.264583;
      const widthMm    = pxToMm(widthPx);
      const heightMm   = pxToMm(heightPx);

      const jsPdfPageMaxMm = 5080;
      const isTooTall      = heightMm > jsPdfPageMaxMm;

      const opt: html2pdf.Options = {
        margin:       10,
        filename:     `newsletter-${format(new Date(selectedNewsletter.created_at),'yyyy-MM-dd')}.pdf`,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
        pagebreak:    { mode: isTooTall ? ["css","legacy"] : ["avoid-all"] },
        jsPDF:        {
          unit: "mm",
          format: isTooTall ? "a4" : [widthMm, heightMm],
          orientation: widthMm >= heightMm ? "landscape" : "portrait"
        }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile-optimized header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        {/* Icon and Title Row */}
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Newsletter Library</h1>
        </div>
        
        {/* Date Controls Row - Mobile: Full width below title, Desktop: Right side */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:gap-2 sm:space-y-0">
          {/* Quick Range Buttons */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(7)}
              className={cn(
                "flex-1 sm:flex-none",
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
              className="flex-1 sm:flex-none"
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
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:min-w-[140px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span className="truncate">{format(selectedDate, 'MMM d, yyyy')}</span>
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
              className="flex-1 sm:flex-none"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow">
              <AspectRatio ratio={4/3}>
                <div className="flex flex-col h-full p-4">
                  <Skeleton className="h-4 w-16 mb-3" />
                  <Skeleton className="h-16 w-full mb-3" />
                  <Skeleton className="h-3 w-full mb-2" />
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
              <h2 className="text-lg font-semibold mb-6 text-gray-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                {formatGroupDate(date)}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {groupedNewsletters[date].map((newsletter) => {
                  const title = extractTitle(newsletter.markdown_text);
                  const firstImage = extractFirstImage(newsletter.markdown_text);
                  
                  return (
                    <Card 
                      key={newsletter.id} 
                      className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border border-gray-200/60 hover:border-primary/30 group bg-white/80 backdrop-blur-sm hover:bg-white"
                      onClick={() => viewNewsletter(newsletter)}
                    >
                      <AspectRatio ratio={4/3}>
                        <div className="flex flex-col h-full relative">
                          {/* Enhanced Date Badge */}
                          <div className="absolute top-3 right-3 z-20">
                            <span className="text-xs font-semibold bg-white/95 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-full shadow-lg border border-gray-200/50 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                              {formatShortDate(newsletter.created_at)}
                            </span>
                          </div>
                          
                          {/* Enhanced Image/Icon Section */}
                          <div className="flex-none h-20 bg-gradient-to-br from-primary/8 via-primary/5 to-primary/12 flex items-center justify-center relative overflow-hidden rounded-t-lg">
                            {firstImage ? (
                              <img 
                                src={firstImage} 
                                alt="Newsletter preview" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => {
                                  const img = e.currentTarget as HTMLImageElement;
                                  const fallback = img.nextElementSibling as HTMLElement;
                                  img.style.display = 'none';
                                  if (fallback) {
                                    fallback.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`${firstImage ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                              <FileText className="h-10 w-10 text-primary/60 group-hover:text-primary/80 transition-colors duration-300" />
                            </div>
                            {/* Subtle overlay for better text contrast */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
                          </div>
                          
                          {/* Enhanced Content Section */}
                          <div className="flex-1 p-4 flex flex-col justify-between bg-gradient-to-b from-white to-gray-50/50 group-hover:from-white group-hover:to-white transition-all duration-300">
                            <div className="space-y-2">
                              <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
                                {title}
                              </h3>
                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 hidden sm:block group-hover:text-gray-700 transition-colors duration-300">
                                Newsletter content from {format(new Date(newsletter.created_at), 'MMM d')}
                              </p>
                            </div>
                            
                            {/* Enhanced Bottom Section */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 group-hover:border-primary/20 transition-colors duration-300">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-primary rounded-full group-hover:bg-primary/80 transition-colors duration-300"></div>
                                <span className="text-xs text-gray-500 font-semibold group-hover:text-primary transition-colors duration-300">Newsletter</span>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                <div className="flex items-center gap-1">
                                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                                </div>
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

      {/* Newsletter Dialog with Secure Rendering */}
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
                id="newsletter-content"
                className="prose dark:prose-invert max-w-none my-4" 
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNewsletter.markdown_text) }}
              />
              
              <DialogFooter className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Sanitize content before copying to clipboard
                    const sanitizedContent = DOMPurify.sanitize(selectedNewsletter.markdown_text || "", {
                      ALLOWED_TAGS: [],
                      ALLOWED_ATTR: []
                    });
                    
                    navigator.clipboard.writeText(sanitizedContent)
                      .then(() => toast.success("Newsletter content copied to clipboard"))
                      .catch(() => toast.error("Failed to copy to clipboard"));
                  }}
                >
                  Copy Content
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadAsPDF}
                  disabled={isPdfGenerating}
                >
                  <Download size={16} className="mr-2" />
                  {isPdfGenerating ? "Generating..." : "Download PDF"}
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
