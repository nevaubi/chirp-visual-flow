import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
