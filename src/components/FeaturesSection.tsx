
import { 
  BarChart, 
  Bookmark, 
  MessageSquare,
  Calendar 
} from "lucide-react";
import { useEffect, useRef } from "react";

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function Feature({ icon, title, description, delay }: FeatureProps) {
  const featureRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('animate-fade-in');
              entry.target.classList.remove('opacity-0');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );
    
    if (featureRef.current) {
      observer.observe(featureRef.current);
    }
    
    return () => {
      if (featureRef.current) {
        observer.unobserve(featureRef.current);
      }
    };
  }, [delay]);

  return (
    <div 
      ref={featureRef} 
      className="ios-card opacity-0 soft-glow"
    >
      <div className="mb-4">
        <div className="feature-icon">{icon}</div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function FeaturesSection() {
  const features = [
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Easy Social Media Analysis",
      description: "Track engagement metrics and audience growth with intuitive, real-time analytics dashboards.",
      delay: 0
    },
    {
      icon: <Bookmark className="w-6 h-6" />,
      title: "Automated Bookmark Management",
      description: "Organize and categorize content from across platforms in one central, searchable location.",
      delay: 100
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Custom Tweet Generation",
      description: "Create engaging tweets with AI assistance tailored to your brand voice and audience preferences.",
      delay: 200
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Auto/Schedule Postings",
      description: "Plan and automate content delivery at optimal times for maximum audience engagement.",
      delay: 300
    }
  ];

  return (
    <section id="features" className="py-20 relative blue-peach-gradient">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 subtle-pattern opacity-30 pointer-events-none"></div>
      
      <div className="container px-4 sm:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to streamline your social media workflow in one place.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Feature 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={feature.delay}
            />
          ))}
        </div>
      </div>
      
      {/* Background decorations */}
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl"></div>
      <div className="absolute top-20 right-10 w-72 h-72 bg-secondary/5 rounded-full filter blur-3xl"></div>
      <div className="absolute top-40 left-40 w-36 h-36 bg-blue-200/20 rounded-full filter blur-xl"></div>
      <div className="absolute bottom-40 right-40 w-48 h-48 bg-secondary/10 rounded-full filter blur-2xl"></div>
    </section>
  );
}
