import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Repeat, Bookmark } from 'lucide-react';

export default function TwitterMockup() {
  const [bookmarkedTweets, setBookmarkedTweets] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [zoomState, setZoomState] = useState({ isZoomed: false, index: null, x: 0, y: 0 });
  const containerRef = useRef(null);
  const tweetsRef = useRef([]);
  const animationRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  
  // Custom animation keyframes
  const animationKeyframes = `
    @keyframes bookmark-highlight {
      0% { 
        transform: scale(0.8);
        opacity: 0.5;
      }
      60% {
        transform: scale(1.2);
        opacity: 0.7;
      }
      100% { 
        transform: scale(1);
        opacity: 0;
      }
    }
    
    .animate-bookmark-highlight {
      animation: bookmark-highlight 0.3s ease-out forwards;
    }
    
    @keyframes bookmark-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
    
    .animate-bookmark-pop {
      animation: bookmark-pop 0.25s ease-in-out forwards;
    }
    
    /* Hide scrollbar */
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    /* Zoom animation */
    @keyframes zoom-in {
      from { transform: scale(1); }
      to { transform: scale(3); }
    }
    
    @keyframes zoom-out {
      from { transform: scale(3); }
      to { transform: scale(1); }
    }
    
    .zoom-in {
      animation: zoom-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    .zoom-out {
      animation: zoom-out 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `;
  
  const tweets = [
    {
      name: "Alex Morgan",
      handle: "@amorgan_ai",
      content: "Just trained a new LLM that can understand financial statements. The convergence of AI and finance is where all the exciting innovation is happening right now!",
      likes: 124,
      retweets: 35,
      replies: 13,
      time: "2h",
      avatar: {
        bg: "#AED6F1",
        hair: "#8B4513",
        top: "#ABEBC6",
        gender: "female"
      }
    },
    {
      name: "Jamie Chen",
      handle: "@jchen_finance",
      content: "Anyone have thoughts on the current crypto market? BTC seems to be forming a classic bull flag pattern, but I'm cautious after last week's volatility.",
      likes: 48,
      retweets: 22,
      replies: 38,
      time: "4h",
      avatar: {
        bg: "#D6EAF8",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Taylor Williams",
      handle: "@twilliams_crypto",
      content: "Just published my analysis on Ethereum's recent upgrade. Layer 2 solutions are the future of scalability. Check out the link in my bio!",
      likes: 156,
      retweets: 77,
      replies: 24,
      time: "6h",
      avatar: {
        bg: "#D1F2EB",
        hair: "#A0522D",
        top: "#F9E79F",
        gender: "female"
      }
    },
    {
      name: "Jordan Smith",
      handle: "@jsmith_invest",
      content: "Breaking: Fed announces 25 basis point rate cut! This could signal a major shift in monetary policy. Bullish for growth stocks and crypto.",
      likes: 324,
      retweets: 145,
      replies: 86,
      time: "12h",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Riley Johnson",
      handle: "@rjohnson_ai",
      content: "I'm experimenting with reinforcement learning from human feedback for my fintech startup. The results are mind-blowing! AI is transforming risk assessment.",
      likes: 187,
      retweets: 55,
      replies: 27,
      time: "14h",
      avatar: {
        bg: "#D6EAF8",
        hair: "#5D4037",
        top: "#D5F5E3",
        gender: "female"
      }
    },
    {
      name: "Casey Parker",
      handle: "@cparker_tech",
      content: "Just launched our AI-powered trading algorithm. It outperformed the S&P 500 by 12% in backtesting. DM me if you want early access to the beta!",
      likes: 212,
      retweets: 92,
      replies: 41,
      time: "16h",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Morgan Lee",
      handle: "@morganlee_defi",
      content: "Does anyone else think DeFi is still undervalued? The total value locked has been steadily increasing despite market volatility. Fundamentals are strong.",
      likes: 143,
      retweets: 38,
      replies: 59,
      time: "18h",
      avatar: {
        bg: "#D1F2EB",
        hair: "#8B4513",
        top: "#F5EEF8",
        gender: "female"
      }
    },
    {
      name: "Drew Garcia",
      handle: "@dgarcia_crypto",
      content: "Just discovered this amazing crypto analytics platform with the best on-chain data visualization. Great API and even better insights for algorithmic trading!",
      likes: 167,
      retweets: 44,
      replies: 32,
      time: "20h",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Sophia Chen",
      handle: "@sophia_quant",
      content: "My machine learning model predicted this week's market movements with 78% accuracy. Stochastic gradient boosting + sentiment analysis is the winning combo.",
      likes: 231,
      retweets: 87,
      replies: 42,
      time: "22h",
      avatar: {
        bg: "#D6EAF8",
        hair: "#5D4037",
        top: "#FADBD8",
        gender: "female"
      }
    },
    {
      name: "Ethan Rodriguez",
      handle: "@ethan_fintech",
      content: "Smart contracts are going to disrupt traditional banking within 5 years. The cost savings and efficiency gains are too substantial to ignore.",
      likes: 176,
      retweets: 63,
      replies: 29,
      time: "1d",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Maya Patel",
      handle: "@maya_ai",
      content: "I just published a paper on using transformer models for financial time series forecasting. 43% improvement over LSTM networks. Link in bio!",
      likes: 298,
      retweets: 124,
      replies: 51,
      time: "1d",
      avatar: {
        bg: "#D1F2EB",
        hair: "#5D4037",
        top: "#ABEBC6",
        gender: "female"
      }
    },
    {
      name: "Noah Kim",
      handle: "@noah_dao",
      content: "Our DAO just voted to allocate 50% of treasury to yield farming strategies. Governance tokens are earning 18% APY right now. Best passive income in crypto!",
      likes: 142,
      retweets: 38,
      replies: 27,
      time: "1d",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Olivia Santos",
      handle: "@olivia_trader",
      content: "The correlation between tech stocks and large cap crypto is at an all-time high. Diversification isn't what it used to be in this macro environment.",
      likes: 189,
      retweets: 58,
      replies: 34,
      time: "2d",
      avatar: {
        bg: "#D6EAF8",
        hair: "#8B4513",
        top: "#F9E79F",
        gender: "female"
      }
    },
    {
      name: "Lucas Wright",
      handle: "@lucas_nft",
      content: "NFTs aren't dead, they're evolving. The integration with DeFi and real-world assets is where the true value proposition lies. Art was just the beginning.",
      likes: 167,
      retweets: 45,
      replies: 31,
      time: "2d",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Emma Johnson",
      handle: "@emma_blockchain",
      content: "Layer 1 blockchains are competing on TPS, but security and decentralization matter more. Don't sacrifice the core value proposition for speed.",
      likes: 213,
      retweets: 76,
      replies: 48,
      time: "2d",
      avatar: {
        bg: "#D1F2EB",
        hair: "#8B4513",
        top: "#D5F5E3",
        gender: "female"
      }
    },
    {
      name: "Aiden Thomas",
      handle: "@aiden_hedge",
      content: "Hedge funds are increasingly allocating to AI-managed crypto strategies. The institutional adoption we've been waiting for is happening quietly.",
      likes: 241,
      retweets: 94,
      replies: 37,
      time: "3d",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    },
    {
      name: "Zoe Martinez",
      handle: "@zoe_research",
      content: "Just published our research on quantum computing threats to current cryptography. We need post-quantum solutions sooner than most people realize.",
      likes: 284,
      retweets: 128,
      replies: 59,
      time: "3d",
      avatar: {
        bg: "#D6EAF8",
        hair: "#5D4037",
        top: "#FADBD8",
        gender: "female"
      }
    },
    {
      name: "Liam Carter",
      handle: "@liam_macro",
      content: "The intersection of monetary policy, AI advancement, and crypto adoption is creating the perfect storm for a new economic paradigm. Fascinating times!",
      likes: 178,
      retweets: 52,
      replies: 33,
      time: "3d",
      avatar: {
        bg: "#85C1E9",
        hair: "#17202A",
        top: "#FFFFFF",
        gender: "male"
      }
    }
  ];
  
  // Profile Avatar Component
  const ProfileAvatar = ({ avatar }) => {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden" style={{ backgroundColor: avatar.bg }}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Head shape */}
          <circle cx="50" cy="40" r="25" fill="#F5D0A9" />
          
          {/* Hair */}
          {avatar.gender === 'male' ? (
            <path 
              d="M25 30 Q50 0 75 30 L75 45 Q50 55 25 45 Z" 
              fill={avatar.hair} 
            />
          ) : (
            <path 
              d="M25 35 Q50 10 75 35 L75 55 Q50 65 25 55 Z M30 60 L30 85 Q30 90 35 90 L45 90 L45 60 Z M70 60 L70 85 Q70 90 65 90 L55 90 L55 60 Z" 
              fill={avatar.hair} 
            />
          )}
          
          {/* Clothing */}
          <path 
            d="M30 90 Q50 80 70 90 L70 120 L30 120 Z" 
            fill={avatar.top} 
          />
        </svg>
      </div>
    );
  };
  
  // Keep track of likes, retweets, and replies for each tweet
  const [tweetInteractions, setTweetInteractions] = useState(
    tweets.map(tweet => ({
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      liked: false,
      retweeted: false,
      replied: false
    }))
  );
  
  // Smooth scroll to position
  const smoothScrollTo = (element, targetY, duration) => {
    const startY = element.scrollTop;
    const difference = targetY - startY;
    const startTime = performance.now();
    
    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function - easeInOutCubic
      const easeInOutCubic = t => 
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const easeProgress = easeInOutCubic(progress);
      element.scrollTop = startY + difference * easeProgress;
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  };
  
  // Zoom animation
  const zoomToBookmark = (index) => {
    const tweetElement = tweetsRef.current[index];
    if (!tweetElement) return;
    
    const bookmarkIcon = tweetElement.querySelector('[data-bookmark-id]');
    if (!bookmarkIcon) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const iconRect = bookmarkIcon.getBoundingClientRect();
    
    // Get the relative position inside the container
    const relativeX = (iconRect.left + iconRect.width/2) - containerRect.left;
    const relativeY = (iconRect.top + iconRect.height/2) - containerRect.top + container.scrollTop;
    
    setZoomState({ 
      isZoomed: true, 
      index: index,
      x: relativeX,
      y: relativeY
    });
    
    // After a delay, simulate clicking the bookmark
    setTimeout(() => {
      toggleBookmark(index);
      
      // After bookmark animation completes, zoom back out
      setTimeout(() => {
        setZoomState({ isZoomed: false, index: null, x: 0, y: 0 });
      }, 800);
    }, 600);
  };
  
  // Toggle bookmark for a tweet
  const toggleBookmark = (index) => {
    // Create a pop animation effect when clicking
    const iconElement = document.querySelector(`[data-bookmark-id="${index}"]`);
    if (iconElement) {
      iconElement.classList.remove('animate-bookmark-pop');
      // Force a reflow to restart the animation
      void (iconElement as HTMLElement).offsetWidth;
      iconElement.classList.add('animate-bookmark-pop');
    }
    
    setBookmarkedTweets(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  // Handle like, retweet, reply interactions
  const handleInteraction = (index, type) => {
    setTweetInteractions(prev => {
      const newInteractions = [...prev];
      
      switch(type) {
        case 'like':
          if (newInteractions[index].liked) {
            newInteractions[index].likes--;
            newInteractions[index].liked = false;
          } else {
            newInteractions[index].likes++;
            newInteractions[index].liked = true;
          }
          break;
        case 'retweet':
          if (newInteractions[index].retweeted) {
            newInteractions[index].retweets--;
            newInteractions[index].retweeted = false;
          } else {
            newInteractions[index].retweets++;
            newInteractions[index].retweeted = true;
          }
          break;
        case 'reply':
          if (newInteractions[index].replied) {
            newInteractions[index].replies--;
            newInteractions[index].replied = false;
          } else {
            newInteractions[index].replies++;
            newInteractions[index].replied = true;
          }
          break;
        default:
          break;
      }
      
      return newInteractions;
    });
  };
  
  // Run the demo animation sequence
  const runAnimationSequence = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Reset all bookmarks when starting animation
    setBookmarkedTweets({});
    
    const container = containerRef.current;
    if (!container) return;
    
    // Clear any existing animation
    clearTimeout(scrollTimeoutRef.current);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Reset scroll position
    container.scrollTop = 0;
    
    // Define animation steps
    const sequence = [
      // Step 1: Scroll down to tweet #4
      () => {
        smoothScrollTo(container, 160 * 4, 1000);
        return 1100;
      },
      // Step 2: Zoom in to bookmark on tweet #4
      () => {
        zoomToBookmark(4);
        return 2200;
      },
      // Step 3: Continue scrolling to tweet #10
      () => {
        smoothScrollTo(container, 160 * 10, 1200);
        return 1300;
      },
      // Step 4: Zoom in to bookmark on tweet #10
      () => {
        zoomToBookmark(10);
        return 2200;
      },
      // Step 5: Return to normal scrolling state and restart animation
      () => {
        setTimeout(() => {
          setIsAnimating(false);
          // Wait a moment then restart the animation
          setTimeout(() => {
            runAnimationSequence();
          }, 1000);
        }, 300);
        return 0;
      }
    ];
    
    // Execute the animation sequence
    let currentStep = 0;
    
    const executeNextStep = () => {
      if (currentStep < sequence.length) {
        const delayForNextStep = sequence[currentStep]();
        currentStep++;
        
        if (delayForNextStep > 0) {
          scrollTimeoutRef.current = setTimeout(executeNextStep, delayForNextStep);
        }
      }
    };
    
    executeNextStep();
  };
  
  // Start animation sequence on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runAnimationSequence();
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(scrollTimeoutRef.current);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow-sm rounded-xl overflow-hidden relative">
      <style>{animationKeyframes}</style>
      <div className="border-b border-gray-200 p-3 bg-white sticky top-0 z-10">
        <h1 className="font-bold text-xl text-[#14171A]">Home</h1>
      </div>
      
      <div 
        className={`h-[500px] overflow-y-auto bg-white hide-scrollbar ${zoomState.isZoomed ? 'relative overflow-hidden' : ''}`}
        ref={containerRef}
      >
        {zoomState.isZoomed && (
          <div 
            className="absolute inset-0 z-10 bg-white/95 flex items-center justify-center"
            style={{
              transform: `translate(${-zoomState.x + containerRef.current?.offsetWidth / 2}px, ${-zoomState.y + 250}px)`
            }}
          >
            <div className={`transform ${zoomState.isZoomed ? 'zoom-in' : 'zoom-out'}`}>
              {tweets.map((tweet, index) => (
                <div 
                  key={index}
                  className={`absolute transition-opacity duration-500 ${zoomState.index === index ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: containerRef.current?.offsetWidth
                  }}
                >
                  <div className="flex">
                    <div className="mr-3 flex-shrink-0">
                      <ProfileAvatar avatar={tweet.avatar} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-sm">
                        <span className="font-bold text-[#14171A]">{tweet.name}</span>
                        <span className="text-[#657786] ml-2">{tweet.handle}</span>
                        <span className="text-[#AAB8C2] mx-1">·</span>
                        <span className="text-[#657786]">{tweet.time}</span>
                      </div>
                      
                      <p className="mt-1 text-[#14171A]">{tweet.content}</p>
                      
                      <div className="mt-3 flex items-center">
                        <div className="flex-1"></div>
                        
                        <button 
                          className={`flex items-center justify-center w-10 h-10 ${bookmarkedTweets[index] ? 'text-[#1DA1F2]' : 'text-[#657786]'} relative overflow-hidden`}
                        >
                          <div 
                            className={`p-2 rounded-full ${bookmarkedTweets[index] ? 'bg-[#E8F5FE]' : ''}`}
                            data-bookmark-id={`zoom-${index}`}
                          >
                            {bookmarkedTweets[index] ? (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" 
                                fill="#1DA1F2" 
                                stroke="#1DA1F2" 
                                strokeWidth="1.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                              >
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                              </svg>
                            ) : (
                              <Bookmark size={24} />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {tweets.map((tweet, index) => (
          <div 
            key={index} 
            className="p-4 border-b border-gray-200"
            ref={el => tweetsRef.current[index] = el}
          >
            <div className="flex">
              <div className="mr-3 flex-shrink-0">
                <ProfileAvatar avatar={tweet.avatar} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-sm">
                  <span className="font-bold text-[#14171A]">{tweet.name}</span>
                  <span className="text-[#657786] ml-2">{tweet.handle}</span>
                  <span className="text-[#AAB8C2] mx-1">·</span>
                  <span className="text-[#657786]">{tweet.time}</span>
                </div>
                
                <p className="mt-1 text-[#14171A]">{tweet.content}</p>
                
                <div className="mt-3 flex items-center">
                  <div className="flex-1 flex space-x-12 pr-5">
                    <button 
                      className={`flex items-center ${tweetInteractions[index].replied ? 'text-[#1DA1F2]' : 'text-[#657786] hover:text-[#1DA1F2]'} group`}
                      onClick={() => handleInteraction(index, 'reply')}
                    >
                      <div className={`p-2 rounded-full ${tweetInteractions[index].replied ? 'bg-[#E8F5FE]' : 'group-hover:bg-[#E8F5FE]'}`}>
                        <MessageCircle size={18} />
                      </div>
                      <span className="ml-1 text-xs">{tweetInteractions[index].replies}</span>
                    </button>
                    
                    <button 
                      className={`flex items-center ${tweetInteractions[index].retweeted ? 'text-green-500' : 'text-[#657786] hover:text-green-500'} group`}
                      onClick={() => handleInteraction(index, 'retweet')}
                    >
                      <div className={`p-2 rounded-full ${tweetInteractions[index].retweeted ? 'bg-green-50' : 'group-hover:bg-green-50'}`}>
                        <Repeat size={18} />
                      </div>
                      <span className="ml-1 text-xs">{tweetInteractions[index].retweets}</span>
                    </button>
                    
                    <button 
                      className={`flex items-center ${tweetInteractions[index].liked ? 'text-rose-600' : 'text-[#657786] hover:text-rose-600'} group`}
                      onClick={() => handleInteraction(index, 'like')}
                    >
                      <div className={`p-2 rounded-full ${tweetInteractions[index].liked ? 'bg-rose-50' : 'group-hover:bg-rose-50'}`}>
                        <Heart size={18} />
                      </div>
                      <span className="ml-1 text-xs">{tweetInteractions[index].likes}</span>
                    </button>
                  </div>
                  
                  <button 
                    className={`flex items-center justify-center w-10 h-10 ${bookmarkedTweets[index] ? 'text-[#1DA1F2]' : 'text-[#657786] hover:text-[#1DA1F2]'} group relative overflow-hidden ${isAnimating ? 'pointer-events-none' : ''}`}
                    onClick={() => toggleBookmark(index)}
                  >
                    <div 
                      className={`p-2 rounded-full transition-all duration-200 ${
                        bookmarkedTweets[index] 
                          ? 'bg-[#E8F5FE]' 
                          : 'group-hover:bg-[#E8F5FE]'
                      }`}
                      data-bookmark-id={index}
                    >
                      {bookmarkedTweets[index] ? (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="21" 
                          height="21" 
                          viewBox="0 0 24 24" 
                          fill="#1DA1F2" 
                          stroke="#1DA1F2" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="transition-transform duration-200 transform scale-110"
                        >
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                      ) : (
                        <Bookmark size={20} className="transition-all duration-200" />
                      )}
                    </div>
                    
                    {/* Simple highlight effect on bookmark */}
                    {bookmarkedTweets[index] && (
                      <span className="absolute inset-0 rounded-full bg-[#1DA1F2] animate-bookmark-highlight pointer-events-none" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
