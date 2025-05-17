
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        <div className="flex flex-col items-center">
          {/* Logo and Name (side by side) */}
          <Link to="/" className="mb-6 flex items-center gap-2">
            <img 
              src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
              alt="Chirpmetrics Logo" 
              className="h-8 w-8" 
            />
            <span className="text-twitter-blue font-semibold text-xl">chirpmetrics</span>
          </Link>

          {/* Terms and Privacy Links */}
          <div className="flex gap-6 mb-6">
            <Link to="/terms" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">
              Privacy Policy
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>© {currentYear} Chirpmetrics. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
