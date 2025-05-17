
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Wrench, Twitter } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

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
            <Link to="/" className="flex items-center gap-1.5">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-10 w-10"
              />
              <span className="font-bold text-2xl text-[#0087C8]">chirpmetrics</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className={`${location.pathname === '/' ? 'text-[#0087C8]' : 'text-[#64748b]'} font-medium hover:text-[#0087C8] transition-colors`}
            >
              Home
            </Link>
            <Link 
              to="/twitter-growth" 
              className={`${location.pathname === '/twitter-growth' ? 'text-[#0087C8]' : 'text-[#64748b]'} font-medium hover:text-[#0087C8] transition-colors flex items-center gap-1.5`}
            >
              <Twitter className="h-4 w-4" />
              <span>Twitter Growth</span>
            </Link>
            <Link 
              to="/auto-newsletters" 
              className={`${location.pathname === '/auto-newsletters' ? 'text-[#0087C8]' : 'text-[#64748b]'} font-medium hover:text-[#0087C8] transition-colors`}
            >
              Auto Newsletters
            </Link>
            <Link 
              to="#" 
              className="text-[#64748b] font-medium hover:text-[#0087C8] transition-colors flex items-center gap-1.5"
            >
              <Wrench className="h-4 w-4" />
              <span>Free Tools</span>
            </Link>
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
            <Link 
              to="/" 
              className={`${location.pathname === '/' ? 'text-[#0087C8]' : 'text-[#64748b]'} font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors`}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/twitter-growth" 
              className={`${location.pathname === '/twitter-growth' ? 'text-[#0087C8]' : 'text-[#64748b]'} font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors flex items-center gap-1.5`}
              onClick={() => setIsOpen(false)}
            >
              <Twitter className="h-4 w-4" />
              <span>Twitter Growth</span>
            </Link>
            <Link 
              to="/auto-newsletters" 
              className={`${location.pathname === '/auto-newsletters' ? 'text-[#0087C8]' : 'text-[#64748b]'} font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors`}
              onClick={() => setIsOpen(false)}
            >
              Auto Newsletters
            </Link>
            <Link 
              to="#" 
              className="text-[#64748b] font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors flex items-center gap-1.5"
              onClick={() => setIsOpen(false)}
            >
              <Wrench className="h-4 w-4" />
              <span>Free Tools</span>
            </Link>
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
