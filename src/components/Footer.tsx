
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 pt-16 pb-8">
      <div className="container-custom">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <Link to="/" className="mb-8">
            <div className="flex flex-col items-center">
              <img 
                src="/lovable-uploads/5ffc42ed-bb49-42fc-8cf1-ccc074cc3622.png" 
                alt="Chirpmetrics Logo" 
                className="h-12 w-12 mb-2" 
              />
              <span className="text-twitter-blue font-semibold text-xl">chirpmetrics</span>
            </div>
          </Link>

          {/* Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl mb-12">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/features" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Pricing</Link></li>
                <li><Link to="/tools" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Free Tools</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/blog" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Blog</Link></li>
                <li><Link to="/guides" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Guides</Link></li>
                <li><Link to="/help" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Careers</Link></li>
                <li><Link to="/contact" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="text-gray-600 dark:text-gray-400 hover:text-twitter-blue dark:hover:text-twitter-blue transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center border-t border-gray-200 dark:border-gray-800 pt-8 text-sm text-gray-500 dark:text-gray-400 w-full">
            <p>© {currentYear} Chirpmetrics. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
