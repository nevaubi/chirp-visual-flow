
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Wrench, LogIn, LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = !!authState.user;
  const profile = authState.profile;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    navigate('/auth');
  };

  const handleSignupClick = () => {
    navigate('/auth');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard/home');
  };

  // Fix: Wrap signOut in a proper event handler
  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 w-full ${scrolled ? 'bg-white/95 shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-7 w-7"
            />
            <span className="font-bold text-2xl text-[#0087C8]">chirpmetrics</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-[#0087C8] font-medium hover:text-[#0270A8] transition-colors">Home</Link>
            
            {/* Free Tools Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-[#64748b] font-medium hover:text-[#0087C8] transition-colors flex items-center gap-1.5">
                  <Wrench className="h-4 w-4" />
                  <span>Free Tools</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="bg-white">
                <DropdownMenuItem asChild>
                  <Link to="/tools/tweet-id-converter" className="flex items-center gap-2 cursor-pointer">
                    Tweet-ID Converter
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/tools/tweet-screenshot" className="flex items-center gap-2 cursor-pointer">
                    Tweet to Screenshot
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-[#0087C8] hover:text-[#0270A8] hover:bg-blue-50/30 px-4 font-medium flex items-center gap-2"
                  onClick={handleDashboardClick}
                >
                  <User size={16} />
                  <span>Dashboard</span>
                </Button>
                <Button 
                  className="bg-[#0087C8] hover:bg-[#0270A8] text-white rounded-full px-4 font-medium flex items-center gap-2"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-[#0087C8] hover:text-[#0270A8] hover:bg-blue-50/30 px-4 font-medium flex items-center gap-2"
                  onClick={handleLoginClick}
                >
                  <LogIn size={16} />
                  <span>Sign in</span>
                </Button>
                <Button 
                  className="bg-[#0087C8] hover:bg-[#0270A8] text-white rounded-full px-4 font-medium"
                  onClick={handleSignupClick}
                >
                  Signup for Free
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && (
              <Avatar className="h-8 w-8 border border-gray-200 mr-2">
                <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                <AvatarFallback>
                  {profile?.twitter_username ? profile.twitter_username.substring(0, 2).toUpperCase() : 'CM'}
                </AvatarFallback>
              </Avatar>
            )}
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
              className="text-[#0087C8] font-medium py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            
            {/* Mobile Free Tools Dropdown */}
            <div className="flex flex-col">
              <div className="text-[#64748b] font-medium py-2 px-3 rounded-lg flex items-center gap-1.5">
                <Wrench className="h-4 w-4" />
                <span>Free Tools</span>
              </div>
              <div className="ml-6 flex flex-col">
                <Link
                  to="/tools/tweet-id-converter"
                  className="text-[#64748b] py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Tweet-ID Converter
                </Link>
                <Link
                  to="/tools/tweet-screenshot"
                  className="text-[#64748b] py-2 px-3 rounded-lg hover:bg-blue-50/30 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Tweet to Screenshot
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-blue-100">
              {isAuthenticated ? (
                <>
                  <Button 
                    variant="ghost" 
                    className="justify-start text-[#0087C8] hover:bg-blue-50/30 flex items-center gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/dashboard/home');
                    }}
                  >
                    <User size={16} />
                    <span>Dashboard</span>
                  </Button>
                  <Button 
                    className="bg-[#0087C8] hover:bg-[#0270A8] text-white font-medium flex items-center gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className="justify-start text-[#0087C8] hover:bg-blue-50/30 flex items-center gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/auth');
                    }}
                  >
                    <LogIn size={16} />
                    <span>Sign in</span>
                  </Button>
                  <Button 
                    className="bg-[#0087C8] hover:bg-[#0270A8] text-white font-medium"
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/auth');
                    }}
                  >
                    Signup for Free
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
