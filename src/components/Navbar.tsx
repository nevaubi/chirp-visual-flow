import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Wrench } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full ${scrolled ? 'bg-white/95 shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="rounded-full bg-[#0087C8] w-10 h-10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8c-2.168 0-4 1.832-4 4s1.832 4 4 4 4-1.832 4-4-1.832-4-4-4z" fill="white" />
                <path d="M12 4c4.416 0 8 3.584 8 8s-3.584 8-8 8-8-3.584-8-8 3.584-8 8-8m0-2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2z" fill="white" />
                <path d="M19 12c0-3.866-3.134-7-7-7v2c2.757 0 5 2.243 5 5h2z" fill="white" />
              </svg>
            </div>
            <span className="font-bold text-2xl text-[#0087C8]">chirpmetrics</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-[#0087C8] font-medium hover:text-[#0270A8] transition-colors">Home</a>
            <a href="#" className="text-[#64748b] font-medium hover:text-[#0087C8] transition-colors flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              <span>Free Tools</span>
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="text-[#0087C8] hover:text-[#0270A8] hover:bg-blue-50/30 px-4 font-medium">Sign in</Button>
            <Button className="bg-[#0087C8] hover:bg-[#0270A8] text-white rounded-full px-4 font-medium">Signup for Free</Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-[#0087C8] hover:bg-blue-50/30" 
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="bg-white shadow-lg p-4 md:hidden animate-fade-in border-t border-blue-100">
          <nav className="max-w-7xl mx-auto flex flex-col gap-2">
            <a 
              href="#" 
              className="text-[#0087C8] font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </a>
            <a 
              href="#" 
              className="text-[#64748b] font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors flex items-center gap-1.5"
              onClick={() => setIsOpen(false)}
            >
              <Wrench className="h-4 w-4" />
              <span>Free Tools</span>
            </a>
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-blue-100">
              <Button variant="ghost" className="justify-start text-[#0087C8] hover:bg-blue-50/30">Sign in</Button>
              <Button className="bg-[#0087C8] hover:bg-[#0270A8] text-white font-medium">Signup for Free</Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
