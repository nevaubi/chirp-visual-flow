
import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, Twitter } from 'lucide-react';

type AnimationState = 'idle' | 'loading' | 'success';

interface NewsletterAnimationProps {
  state: AnimationState;
  onComplete?: () => void;
}

interface LoadingMessage {
  text: string;
  subtext: string;
}

const NewsletterAnimation: React.FC<NewsletterAnimationProps> = ({ 
  state, 
  onComplete 
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const animationInterval = useRef<NodeJS.Timeout | null>(null);
  const messageInterval = useRef<NodeJS.Timeout | null>(null);

  const loadingMessages: LoadingMessage[] = [
    { text: "Gathering your bookmarks...", subtext: "This usually takes 10-15 seconds" },
    { text: "Analyzing tweet content...", subtext: "Finding the best posts" },
    { text: "Creating your newsletter...", subtext: "Almost done!" }
  ];

  // Reset intervals when component unmounts
  useEffect(() => {
    return () => {
      if (animationInterval.current) clearInterval(animationInterval.current);
      if (messageInterval.current) clearTimeout(messageInterval.current);
    };
  }, []);

  // Handle state changes
  useEffect(() => {
    if (state === 'loading') {
      startAnimations();
    } else if (state === 'success') {
      showSuccess();
    } else {
      resetAnimation();
    }
  }, [state]);

  const startAnimations = () => {
    if (!animationContainerRef.current) return;
    
    // Reset state
    setMessageIndex(0);
    if (animationInterval.current) clearInterval(animationInterval.current);
    if (messageInterval.current) clearTimeout(messageInterval.current);
    
    // Make the animation container visible
    const container = animationContainerRef.current;
    const loadingState = container.querySelector('.loading-state');
    const successState = container.querySelector('.success-state');
    
    container.classList.add('active');
    loadingState?.classList.add('active');
    successState?.classList.remove('active');
    
    // Start bookmark animations
    startBookmarkAnimations();
    
    // Cycle through loading messages
    messageInterval.current = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2000);
  };

  const startBookmarkAnimations = () => {
    if (!animationContainerRef.current) return;
    
    const container = animationContainerRef.current;
    const bookmarks = container.querySelectorAll('.bookmark-icon');
    let index = 0;
    
    // Calculate end position (center of newsletter)
    const newsletter = container.querySelector('.newsletter-visual');
    if (!newsletter) return;
    
    const newsletterRect = newsletter.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const centerX = newsletterRect.width / 2;
    const centerY = newsletterRect.height / 2;
    
    animationInterval.current = setInterval(() => {
      const bookmark = bookmarks[index] as HTMLElement;
      if (!bookmark) return;
      
      const bookmarkRect = bookmark.getBoundingClientRect();
      const startX = bookmarkRect.left - containerRect.left;
      const startY = bookmarkRect.top - containerRect.top;
      
      // Calculate direction to center
      const deltaX = centerX - startX + containerRect.width/4;
      const deltaY = centerY - startY;
      
      bookmark.style.setProperty('--end-x', `${deltaX}px`);
      bookmark.style.setProperty('--end-y', `${deltaY}px`);
      
      bookmark.classList.add('active');
      
      setTimeout(() => {
        bookmark.classList.remove('active');
      }, 3000);
      
      index = (index + 1) % bookmarks.length;
    }, 500);
  };

  const showSuccess = () => {
    if (!animationContainerRef.current) return;
    
    // Clear intervals
    if (animationInterval.current) clearInterval(animationInterval.current);
    if (messageInterval.current) clearTimeout(messageInterval.current);
    
    const container = animationContainerRef.current;
    const loadingState = container.querySelector('.loading-state');
    const successState = container.querySelector('.success-state');
    
    // Hide loading, show success
    loadingState?.classList.remove('active');
    container.classList.remove('active');
    
    setTimeout(() => {
      successState?.classList.add('active');
      
      // Call onComplete after a delay
      if (onComplete) {
        setTimeout(onComplete, 2500);
      }
    }, 300);
  };

  const resetAnimation = () => {
    if (!animationContainerRef.current) return;
    
    // Clear intervals
    if (animationInterval.current) clearInterval(animationInterval.current);
    if (messageInterval.current) clearTimeout(messageInterval.current);
    
    const container = animationContainerRef.current;
    const loadingState = container.querySelector('.loading-state');
    const successState = container.querySelector('.success-state');
    
    // Reset all states
    container.classList.remove('active');
    loadingState?.classList.remove('active');
    successState?.classList.remove('active');
    
    // Reset message index
    setMessageIndex(0);
  };

  return (
    <div className="animation-section w-full h-full min-h-[250px] relative">
      <div ref={animationContainerRef} className="animation-container">
        <div className="newsletter-visual">
          <div className="newsletter-header"></div>
          <div className="newsletter-content">
            <div className="content-line"></div>
            <div className="content-line"></div>
            <div className="content-line"></div>
            <div className="content-line"></div>
            <div className="content-line"></div>
          </div>
        </div>
        
        {/* Bookmark Icons with different colors */}
        <div className="bookmark-icon text-blue-500">
          <Bookmark size={40} fill="currentColor" />
        </div>
        <div className="bookmark-icon text-purple-500">
          <Bookmark size={40} fill="currentColor" />
        </div>
        <div className="bookmark-icon text-green-500">
          <Bookmark size={40} fill="currentColor" />
        </div>
        <div className="bookmark-icon text-amber-500">
          <Bookmark size={40} fill="currentColor" />
        </div>
        <div className="bookmark-icon text-red-500">
          <Bookmark size={40} fill="currentColor" />
        </div>
        <div className="bookmark-icon text-teal-500">
          <Bookmark size={40} fill="currentColor" />
        </div>
        
        {/* Twitter/X Icons */}
        <div className="twitter-icon">
          <Twitter size={24} />
        </div>
        <div className="twitter-icon">
          <Twitter size={24} />
        </div>
        <div className="twitter-icon">
          <Twitter size={24} />
        </div>
        
        {/* Particles */}
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        
        <div className="loading-state">
          <p className="loading-text">{loadingMessages[messageIndex].text}</p>
          <p className="loading-subtext">{loadingMessages[messageIndex].subtext}</p>
        </div>
      </div>
      
      <div className="success-state">
        <div className="checkmark-circle">
          <svg viewBox="0 0 80 80">
            <circle className="success-circle" cx="40" cy="40" r="30" fill="none" stroke="#10b981" strokeWidth="3"/>
            <path className="success-check" d="M25 40 L35 50 L55 30" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="loading-text">Newsletter Generated!</p>
        <p className="loading-subtext">Your newsletter is ready to view</p>
      </div>
    </div>
  );
};

export default NewsletterAnimation;
