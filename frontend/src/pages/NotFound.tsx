import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Search, MapPin, ArrowLeft, AlertTriangle } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const quickLinks = [
    { icon: Home, label: 'Home', path: '/', description: 'Return to homepage' },
    { icon: MapPin, label: 'Locations', path: '/branches', description: 'Find our gym locations' },
    { icon: Search, label: 'About Us', path: '/about', description: 'Learn more about FitGym Pro' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 px-4 min-h-screen flex items-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-red-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 left-1/3 w-28 h-28 bg-orange-400 rounded-full filter blur-2xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <div className="mb-8 animate-fade-in">
            <div className="w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 group">
              <AlertTriangle className="h-16 w-16 text-red-400 animate-bounce" />
            </div>
          </div>
          
          <h1 className="text-8xl md:text-9xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent animate-fade-in">
            404
          </h1>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 animate-fade-in-delay">
            Oops! Page Not Found
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto animate-fade-in-delay-2">
            Looks like you've wandered off the beaten path. The page you're looking for doesn't exist, 
            but don't worry – we'll help you get back on track!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-delay-3">
            <Button size="lg" asChild className="transform hover:scale-105 transition-all duration-300">
              <Link to="/">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="transform hover:scale-105 transition-all duration-300 text-white border-white hover:bg-white hover:text-gray-900">
              <Link to="/branches">
                <MapPin className="h-5 w-5 mr-2" />
                Find Locations
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-12 text-white">
            Or explore these popular sections:
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {quickLinks.map((link, index) => (
              <Card 
                key={index} 
                className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105"
              >
                <CardContent className="p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <link.icon className="h-8 w-8 text-primary" />
                    </div>
                    
                    <h4 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                      {link.label}
                    </h4>
                    
                    <p className="text-muted-foreground text-sm mb-4 group-hover:text-foreground transition-colors duration-300">
                      {link.description}
                    </p>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild 
                      className="group-hover:scale-105 transition-transform duration-300"
                    >
                      <Link to={link.path}>
                        Visit Page
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-2xl mx-auto">
          <Card className="gym-card-gradient border-primary relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <CardContent className="p-12 text-center relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors duration-300">
                Still Can't Find What You're Looking For?
              </h3>
              
              <p className="text-muted-foreground mb-6 group-hover:text-foreground transition-colors duration-300">
                Our team is here to help! Contact us and we'll get you to the right place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="transform hover:scale-105 transition-all duration-300">
                  Contact Support
                </Button>
                <Button size="lg" variant="outline" className="transform hover:scale-105 transition-all duration-300">
                  Site Map
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s both;
        }
        
        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.4s both;
        }
        
        .animate-fade-in-delay-3 {
          animation: fade-in 0.8s ease-out 0.6s both;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-2000 {
          animation-delay: 2s;
        }
        
        /* Professional hover animations */
        .group:hover .transform {
          transform: translateY(-2px);
        }
        
        /* Smooth transitions for all interactive elements */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default NotFound;