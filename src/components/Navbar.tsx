import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    navigate('/auth?tab=login');
  };

  const handleSignupClick = () => {
    navigate('/auth?tab=signup');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard/home');
  };

  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 w-full ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100/50' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6 lg:py-8">
        <div className="flex items-center justify-between">
          {/* Logo section */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/newlogo.png" 
              alt="Letternest Logo" 
              className="h-9 w-9 transition-transform duration-300 group-hover:scale-110"
            />
            <span className="font-black text-2xl lg:text-3xl tracking-tight">
              <span className="text-black">letter</span>
              <span className="text-[#FF6B35]">nest</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {/* Newsletter Links Group */}
            <div className="relative ml-4 flex flex-col items-center">
              <span className="text-xs font-semibold text-gray-700 tracking-wide transform -translate-y-2 underline">Newsletters</span>
              <div className="flex items-center gap-2 transform -translate-y-2">
                <Link 
                  to="/ticker-drop" 
                  className="flex items-center gap-2 text-black hover:text-gray-600 px-3 py-1.5 font-medium text-[16px] rounded-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  <FileText size={14} />
                  <span>The Ticker Drop</span>
                </Link>
                
                <div className="w-px h-5 bg-black"></div>
                
                <Link 
                  to="/chain-of-thought" 
                  className="flex items-center gap-2 text-black hover:text-gray-600 px-3 py-1.5 font-medium text-[16px] rounded-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  <FileText size={14} />
                  <span>Chain of Thought</span>
                </Link>
                
                <div className="w-px h-5 bg-black"></div>
                
                <Link 
                  to="/satoshi-summary" 
                  className="flex items-center gap-2 text-black hover:text-gray-600 px-3 py-1.5 font-medium text-[16px] rounded-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  <FileText size={14} />
                  <span>Satoshi Summary</span>
                </Link>
              </div>
            </div>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  className="text-[#0087C8] hover:text-[#0270A8] hover:bg-blue-50/50 px-8 py-3 font-semibold flex items-center gap-2 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md backdrop-blur-sm"
                  onClick={handleDashboardClick}
                >
                  <User size={18} />
                  <span>Dashboard</span>
                </Button>
                <Button 
                  className="bg-gradient-to-r from-[#0087C8] to-[#006CA1] hover:from-[#0270A8] hover:to-[#005082] text-white rounded-full px-8 py-3 font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg backdrop-blur-sm"
                  onClick={handleSignOut}
                >
                  <LogOut size={18} />
                  <span>Sign out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  className="text-[#0087C8] hover:text-[#0270A8] hover:bg-blue-50/50 px-8 py-3 font-semibold flex items-center gap-2 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md backdrop-blur-sm"
                  onClick={handleLoginClick}
                >
                  <LogIn size={18} />
                  <span>Sign in</span>
                </Button>
                <Button 
                  className="bg-gradient-to-r from-[#0087C8] to-[#006CA1] hover:from-[#0270A8] hover:to-[#005082] text-white rounded-full px-8 py-3 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg backdrop-blur-sm hover:glow-pulse"
                  onClick={handleSignupClick}
                >
                  Signup for Free
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && (
              <Avatar className="h-8 w-8 border border-gray-200 mr-2">
                <AvatarImage src={profile?.twitter_profilepic_url || undefined} alt={profile?.twitter_username || 'User'} />
                <AvatarFallback>
                  {profile?.twitter_username ? profile.twitter_username.substring(0, 2).toUpperCase() : 'LN'}
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
              to="/ticker-drop" 
              className="flex items-center gap-2 text-black hover:text-gray-600 p-2 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FileText size={16} />
              <span>The Ticker Drop</span>
            </Link>
            
            <Link 
              to="/chain-of-thought" 
              className="flex items-center gap-2 text-black hover:text-gray-600 p-2 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FileText size={16} />
              <span>Chain of Thought</span>
            </Link>
            
            <Link 
              to="/satoshi-summary" 
              className="flex items-center gap-2 text-black hover:text-gray-600 p-2 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FileText size={16} />
              <span>Satoshi Summary</span>
            </Link>
            
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100">
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
                      navigate('/auth?tab=login');
                    }}
                  >
                    <LogIn size={16} />
                    <span>Sign in</span>
                  </Button>
                  <Button 
                    className="bg-[#0087C8] hover:bg-[#0270A8] text-white font-medium"
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/auth?tab=signup');
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
