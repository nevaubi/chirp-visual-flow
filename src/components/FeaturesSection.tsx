
import { useIsMobile } from "@/hooks/use-mobile";

export default function FeaturesSection() {
  const isMobile = useIsMobile();

  return (
    <section id="features" className="py-20 relative bg-[#0087C8]">
      <div className="container px-4 sm:px-8">
        <div className="flex justify-center items-center">
          <img 
            src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
            alt="Tweet bookmarking feature" 
            className={`rounded-lg shadow-xl ${isMobile ? 'w-full' : 'w-auto max-w-[80%]'} transition-all duration-300`}
          />
        </div>
      </div>
    </section>
  );
}
