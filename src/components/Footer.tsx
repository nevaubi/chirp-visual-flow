
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
              src="/logoo.png" 
              alt="Letternest Logo" 
              className="h-8 w-8" 
            />
            <span className="font-semibold text-xl">
              <span className="text-black">letter</span>
              <span className="text-[#FF6B35]">nest</span>
            </span>
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

          {/* Social Media Link */}
          <div className="mb-6">
            <a 
              href="https://x.com/letternest_ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors"
            >
              <span>Follow us on</span>
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
              <span>@letternest_ai</span>
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>© {currentYear} Letternest. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
