import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Dumbbell, Users, Award, TrendingUp, Clock, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';

const Home = () => {
  const [animatedStats, setAnimatedStats] = useState({
    members: 0,
    trainers: 0,
    locations: 0,
    years: 0
  });

  // Stats animation effect
  useEffect(() => {
    const targetStats = { members: 5000, trainers: 50, locations: 12, years: 10 };
    const duration = 2000; // 2 seconds
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedStats({
        members: Math.floor(targetStats.members * progress),
        trainers: Math.floor(targetStats.trainers * progress),
        locations: Math.floor(targetStats.locations * progress),
        years: Math.floor(targetStats.years * progress)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(targetStats);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Dumbbell,
      title: 'State-of-the-Art Equipment',
      description: 'Latest fitness technology and premium equipment for all your workout needs.',
      color: 'from-blue-500 to-purple-600'
    },
    {
      icon: Users,
      title: 'Expert Trainers',
      description: 'Certified personal trainers ready to help you achieve your fitness goals.',
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: MapPin,
      title: 'Multiple Locations',
      description: 'Convenient locations across the city with flexible membership options.',
      color: 'from-orange-500 to-red-600'
    },
    {
      icon: Trophy,
      title: 'Proven Results',
      description: 'Join thousands of satisfied members who have transformed their lives.',
      color: 'from-purple-500 to-pink-600'
    }
  ];



  const gymSpaces = [
    {
      title: 'Cardio Zone',
      description: 'State-of-the-art cardio equipment with entertainment systems',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
      features: ['Treadmills', 'Ellipticals', 'Bikes', 'Rowing Machines']
    },
    {
      title: 'Strength Training',
      description: 'Complete free weights and resistance training area',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop',
      features: ['Free Weights', 'Cable Machines', 'Bench Press', 'Squat Racks']
    },
    {
      title: 'Group Classes',
      description: 'Spacious studios for yoga, spinning, and group fitness',
      image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&h=400&fit=crop',
      features: ['Yoga Classes', 'HIIT Training', 'Spinning', 'Pilates']
    },
    {
      title: 'Recovery Zone',
      description: 'Relaxation and recovery area with massage therapy',
      image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&h=400&fit=crop',
      features: ['Sauna', 'Steam Room', 'Massage', 'Stretching Area']
    }
  ];



  return (
    <div className="min-h-screen">
      {/* Hero Section with Video Background */}
      <section className="relative overflow-hidden gym-gradient py-0 px-4 min-h-screen flex items-center">
        {/* Video Background - Replace with actual video 
            To implement video background, replace the backgroundImage with:
            <video autoPlay muted loop className="absolute inset-0 w-full h-full object-cover">
              <source src="/path-to-your-gym-video.mp4" type="video/mp4" />
            </video>
        */}
        <div className="absolute inset-0 z-0">
          <div 
            className="relative w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop')`
            }}
          >
            {/* Animated particles overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-bounce"></div>
              <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-blue-400 rounded-full filter blur-2xl animate-bounce delay-1000"></div>
              <div className="absolute bottom-1/4 left-1/3 w-28 h-28 bg-purple-400 rounded-full filter blur-2xl animate-bounce delay-2000"></div>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            Your Fitness Journey Starts{' '}
            <span className="text-primary bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Here
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-delay">
            Experience world-class fitness facilities across multiple locations with expert trainers 
            dedicated to your success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
            <Button size="lg" asChild className="text-lg px-8 py-6 transform hover:scale-105 transition-all duration-300">
              <Link to="/branches">
                <MapPin className="h-5 w-5 mr-2" />
                Find Locations
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 transform hover:scale-105 transition-all duration-300">
              <Link to="/about">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="py-16 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">{animatedStats.members.toLocaleString()}+</div>
              <div className="text-muted-foreground">Happy Members</div>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Award className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">{animatedStats.trainers}+</div>
              <div className="text-muted-foreground">Expert Trainers</div>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">{animatedStats.locations}</div>
              <div className="text-muted-foreground">Locations</div>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold mb-2">{animatedStats.years}+</div>
              <div className="text-muted-foreground">Years of Excellence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Choose FitGym Pro?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group cursor-pointer transform hover:scale-105 hover:shadow-2xl"
              >
                <CardContent className="p-6 text-center relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  <div className="relative z-10">
                    <div className="relative mb-4">
                      <feature.icon className="h-12 w-12 text-primary mx-auto transition-all duration-500 group-hover:scale-125 group-hover:rotate-12" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Fitness Spaces Section */}
      <section className="py-20 px-4 bg-accent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              World-Class Fitness Facilities
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience premium fitness environments designed for every aspect of your wellness journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {gymSpaces.map((space, index) => (
              <Card 
                key={index} 
                className="group overflow-hidden border-0 shadow-2xl transform hover:scale-[1.02] transition-all duration-700 cursor-pointer"
              >
                <div className="relative h-80">
                  <img 
                    src={space.image} 
                    alt={space.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="text-2xl font-bold text-white mb-2">{space.title}</h3>
                      <p className="text-gray-200 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                        {space.description}
                      </p>
                      
                      {/* Features List */}
                      <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                        {space.features.map((feature, idx) => (
                          <span 
                            key={idx}
                            className="px-3 py-1 bg-primary/20 backdrop-blur-sm rounded-full text-sm text-white border border-white/20"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover Icon */}
                  <div className="absolute top-6 right-6 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-75 group-hover:scale-100">
                    <Dumbbell className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="gym-card-gradient border-border p-6 text-center group hover:border-primary transition-colors duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Access</h3>
              <p className="text-muted-foreground">Work out anytime that fits your schedule</p>
            </Card>
            
            <Card className="gym-card-gradient border-border p-6 text-center group hover:border-primary transition-colors duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Personal Training</h3>
              <p className="text-muted-foreground">One-on-one coaching for optimal results</p>
            </Card>
            
            <Card className="gym-card-gradient border-border p-6 text-center group hover:border-primary transition-colors duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Premium Amenities</h3>
              <p className="text-muted-foreground">Luxury locker rooms and spa services</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="gym-card-gradient border-primary relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-12 relative z-10">
              <div className="mb-6">
                <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-primary font-semibold">Join the Movement</span>
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 group-hover:text-primary transition-colors duration-300">
                Ready to Transform Your Life?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 group-hover:text-foreground transition-colors duration-300">
                Join the FitGym Pro community and start your fitness journey today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="transform hover:scale-105 transition-all duration-300">
                  <Link to="/branches">Find a Location</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="transform hover:scale-105 transition-all duration-300">
                  <Link to="/about">Learn More</Link>
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

export default Home;