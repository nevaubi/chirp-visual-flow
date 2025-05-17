
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm" : "bg-transparent"
    }`}>
      <div className="container-custom">
        <nav className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-10 w-10" 
            />
            <span className="text-twitter-blue font-semibold text-xl tracking-tight">chirpmetrics</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">
              Home
            </Link>
            <Link to="/tools" className="text-gray-700 dark:text-gray-200 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors flex items-center">
              <span>Free Tools</span>
            </Link>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link to="/login" className="text-twitter-blue hover:text-twitter-dark transition-colors">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary">
                Signup for Free
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-4 md:hidden">
            <ThemeToggle />
            <button onClick={toggleMenu} aria-label="Toggle mobile menu">
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="flex flex-col space-y-4 py-4 px-2 bg-white dark:bg-gray-900 rounded-lg">
              <Link 
                to="/" 
                className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/tools" 
                className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Free Tools
              </Link>
              <Link 
                to="/login" 
                className="px-4 py-2 text-twitter-blue hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link 
                to="/signup" 
                className="px-4 py-2 bg-twitter-blue text-white rounded-lg text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Signup for Free
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
