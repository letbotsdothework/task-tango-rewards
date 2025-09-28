import { Heart, Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">TT</span>
              </div>
              <span className="text-xl font-bold">TaskTango</span>
            </div>
            <p className="text-background/80 text-sm leading-relaxed">
              Making household tasks fun and fair for families, flatmates, and co-living spaces worldwide.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-background/60 hover:text-background transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Features</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Pricing</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Mobile App</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">API</a>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-semibold">Company</h3>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-background/80 hover:text-background transition-colors">About Us</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Blog</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Careers</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Contact</a>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold">Support</h3>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Help Center</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Privacy Policy</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Terms of Service</a>
              <a href="#" className="block text-background/80 hover:text-background transition-colors">Status</a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/60 text-sm">
            © 2024 TaskTango. All rights reserved.
          </p>
          <p className="text-background/60 text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-400" /> for families everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;