import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Clock, Users, Navigation, Star, CheckCircle } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { Branch } from '@/types';

const Branches = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await db.branches.getAll();
        if (data) setBranches(data);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  // Copyright-free gym images from Unsplash
  const gymImages = [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop'
  ];

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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Locations</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Find a FitGym Pro location near you
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="gym-card-gradient">
                <CardContent className="p-6">
                  <div className="h-48 bg-muted rounded-lg mb-4 animate-pulse" />
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">Our Locations</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto animate-fade-in-delay">
            Find a FitGym Pro location near you and start your fitness journey today
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* Quick Stats */}
        <section className="py-16 -mt-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="gym-card-gradient border-border text-center p-6 group hover:border-primary transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{branches.length} Locations</h3>
              <p className="text-muted-foreground">Across the region</p>
            </Card>
            
            <Card className="gym-card-gradient border-border text-center p-6 group hover:border-primary transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">24/7 Access</h3>
              <p className="text-muted-foreground">Most locations</p>
            </Card>
            
            <Card className="gym-card-gradient border-border text-center p-6 group hover:border-primary transition-all duration-500 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="text-muted-foreground">Facilities</p>
            </Card>
          </div>
        </section>

        {/* Branches Grid */}
        <section className="py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {branches.map((branch, index) => (
              <Card key={branch.id} className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group overflow-hidden transform hover:scale-[1.02]">
                <CardHeader className="p-0">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={gymImages[index % gymImages.length]} 
                      alt={`${branch.name} facility`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Location Badge */}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary/90 text-white border-0">
                        <MapPin className="h-3 w-3 mr-1" />
                        Location {index + 1}
                      </Badge>
                    </div>
                    
                    {/* Rating Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-yellow-500/90 text-white border-0">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        4.8
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <CardTitle className="text-xl mb-4 group-hover:text-primary transition-colors duration-300">
                      {branch.name}
                    </CardTitle>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start space-x-3 text-sm">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                          {branch.address}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-sm">
                        <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                          {branch.hours}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-sm">
                        <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                          {branch.phone}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-sm">
                        <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                          {branch.email}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mb-6 p-3 bg-accent/50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 text-sm">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{branch.member_count}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Members</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 text-sm">
                          <Users className="h-4 w-4 text-secondary" />
                          <span className="font-semibold">{branch.staff_count}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Staff</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="font-semibold">{branch.facilities.length}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Facilities</span>
                      </div>
                    </div>

                    {/* Facilities */}
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2 text-sm">Available Facilities:</h4>
                      <div className="flex flex-wrap gap-1">
                        {branch.facilities.slice(0, 4).map((facility, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {facility}
                          </Badge>
                        ))}
                        {branch.facilities.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{branch.facilities.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button 
                      className="w-full group-hover:scale-105 transition-transform duration-300" 
                      variant="outline"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* No branches message */}
        {branches.length === 0 && !loading && (
          <section className="py-20 text-center">
            <Card className="gym-card-gradient border-border max-w-md mx-auto">
              <CardContent className="p-12">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No locations found</h3>
                <p className="text-muted-foreground">
                  We're expanding! Check back soon for new locations in your area.
                </p>
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

export default Branches;