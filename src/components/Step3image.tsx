import { useEffect, useRef, useState } from "react";

export default function Step3Image() {
  const [isVisible, setIsVisible] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (componentRef.current) {
      observer.observe(componentRef.current);
    }

    return () => {
      if (componentRef.current) {
        observer.unobserve(componentRef.current);
      }
    };
  }, []);

  return (
    <div ref={componentRef} className="w-full h-full flex items-center justify-center p-2">
      <style>{`
        @keyframes imageSlideIn {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .image-container.show {
          animation: imageSlideIn 1.2s ease-out forwards;
          animation-delay: 0.8s;
        }
        
        .image-container {
          opacity: 0;
        }
      `}</style>
      
      <div className={`image-container w-full h-full ${isVisible ? 'show' : ''}`}>
        <img 
          src="/step3.png" 
          alt="Newsletter Preview"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
} 
