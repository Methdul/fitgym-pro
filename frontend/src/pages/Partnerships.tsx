import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Utensils, ShoppingBag, Heart, Car, ExternalLink, Gift, Star, Percent } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Partnership } from '@/types';

const Partnerships = () => {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartnerships = async () => {
      try {
        const { data } = await db.partnerships.getAll();
        if (data) setPartnerships(data);
      } catch (error) {
        console.error('Error fetching partnerships:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerships();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return Utensils;
      case 'retail':
        return ShoppingBag;
      case 'wellness':
        return Heart;
      case 'automotive':
        return Car;
      default:
        return ShoppingBag;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'food':
        return 'from-green-500 to-emerald-600';
      case 'retail':
        return 'from-blue-500 to-indigo-600';
      case 'wellness':
        return 'from-pink-500 to-rose-600';
      case 'automotive':
        return 'from-purple-500 to-violet-600';
      default:
        return 'from-gray-500 to-slate-600';
    }
  };

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'food':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'retail':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'wellness':
        return 'bg-pink-500/10 text-pink-600 border-pink-200';
      case 'automotive':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 px-4">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Partnerships</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Exclusive benefits and discounts for FitGym Pro members
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="gym-card-gradient">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-muted rounded-lg mb-4 animate-pulse" />
                  <div className="h-6 bg-muted rounded mb-2 animate-pulse" />
                  <div className="h-4 bg-muted rounded mb-4 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">Our Partnerships</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in-delay">
            Exclusive benefits and discounts for FitGym Pro members across various categories
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* Benefits Overview */}
        <section className="py-16 -mt-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="gym-card-gradient border-border text-center p-6 group hover:border-primary transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Percent className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Up to 50%</h3>
              <p className="text-muted-foreground">Member Discounts</p>
            </Card>
            
            <Card className="gym-card-gradient border-border text-center p-6 group hover:border-primary transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Exclusive</h3>
              <p className="text-muted-foreground">Offers & Deals</p>
            </Card>
            
            <Card className="gym-card-gradient border-border text-center p-6 group hover:border-primary transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="text-muted-foreground">Partner Network</p>
            </Card>
          </div>
        </section>

        {/* Partnerships Grid */}
        <section className="py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partnerships.map((partnership) => {
              const IconComponent = getCategoryIcon(partnership.category);
              return (
                <Card 
                  key={partnership.id} 
                  className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group overflow-hidden transform hover:scale-[1.02]"
                >
                  <CardHeader className="relative">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="flex items-center space-x-3 relative z-10">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${getCategoryColor(partnership.category)} group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                          {partnership.name}
                        </CardTitle>
                        <Badge className={`text-xs mt-1 ${getBadgeColor(partnership.category)}`}>
                          {partnership.category.charAt(0).toUpperCase() + partnership.category.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 relative">
                    <div className="relative z-10">
                      <p className="text-muted-foreground text-sm group-hover:text-foreground transition-colors duration-300">
                        {partnership.description}
                      </p>
                      
                      <div className="p-4 border border-primary/20 bg-primary/5 rounded-xl mt-4 group-hover:bg-primary/10 transition-colors duration-300">
                        <div className="flex items-start space-x-2 mb-2">
                          <Gift className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <h4 className="font-semibold text-primary text-sm">Member Benefits:</h4>
                        </div>
                        <p className="text-sm text-foreground">{partnership.benefits}</p>
                      </div>

                      {partnership.website_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4 group-hover:scale-105 transition-transform duration-300" 
                          asChild
                        >
                          <a href={partnership.website_url} target="_blank" rel="noopener noreferrer">
                            Visit Website
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* No partnerships message */}
        {partnerships.length === 0 && !loading && (
          <section className="py-20">
            <Card className="gym-card-gradient border-border max-w-2xl mx-auto relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <CardContent className="p-12 text-center relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Exciting Partnerships Coming Soon</h3>
                <p className="text-muted-foreground text-lg mb-6">
                  We're working on bringing you exciting partner benefits across food, retail, wellness, and more. 
                  Check back soon for exclusive member discounts!
                </p>
                <Badge className="bg-primary/10 text-primary px-4 py-2">
                  <Star className="h-4 w-4 mr-2" />
                  Stay Tuned
                </Badge>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Call to Action */}
        {partnerships.length > 0 && (
          <section className="py-20">
            <Card className="gym-card-gradient border-primary relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <CardContent className="p-12 text-center relative z-10">
                <div className="mb-6">
                  <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
                    <Gift className="h-4 w-4 text-primary" />
                    <span className="text-primary font-semibold">Member Exclusive</span>
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 group-hover:text-primary transition-colors duration-300">
                  Ready to Save More?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 group-hover:text-foreground transition-colors duration-300">
                  Join FitGym Pro today and unlock exclusive discounts from our premium partners.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="transform hover:scale-105 transition-all duration-300">
                    Join Now
                  </Button>
                  <Button size="lg" variant="outline" className="transform hover:scale-105 transition-all duration-300">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

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
        
        .delay-1000 {
          animation-delay: 1s;
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

export default Partnerships;