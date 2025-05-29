
import React, { useEffect, useState } from 'react';
import { marked } from 'marked';

interface NewsletterDialogContentProps {
  markdownText: string | null;
}

const NewsletterDialogContent = ({ markdownText }: NewsletterDialogContentProps) => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    const renderMarkdown = async () => {
      if (!markdownText) {
        setHtmlContent("<p>No content available</p>");
        return;
      }
      
      try {
        const result = await marked.parse(markdownText);
        setHtmlContent(typeof result === 'string' ? result : result);
      } catch (err) {
        console.error("Error rendering markdown:", err);
        setHtmlContent("<p>Error rendering content</p>");
      }
    };

    renderMarkdown();
  }, [markdownText]);

  return (
    <div 
      id="newsletter-content"
      className="prose dark:prose-invert max-w-none my-4" 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default NewsletterDialogContent;
