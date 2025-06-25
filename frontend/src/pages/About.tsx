import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Users, MapPin, Trophy, Target, Heart, Shield, Zap } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { GymStaff } from '@/types';

const About = () => {
  const [staff, setStaff] = useState<GymStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({
    members: 0,
    locations: 0,
    equipment: 0,
    years: 0
  });

  // Stats animation effect
  useEffect(() => {
    const targetStats = { members: 5000, locations: 15, equipment: 500, years: 10 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedStats({
        members: Math.floor(targetStats.members * progress),
        locations: Math.floor(targetStats.locations * progress),
        equipment: Math.floor(targetStats.equipment * progress),
        years: Math.floor(targetStats.years * progress)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(targetStats);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data } = await db.gymStaff.getDisplayed();
        if (data) setStaff(data);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const achievements = [
    { icon: Users, label: 'Active Members', value: `${animatedStats.members.toLocaleString()}+`, color: 'from-blue-500 to-purple-600' },
    { icon: MapPin, label: 'Locations', value: `${animatedStats.locations}+`, color: 'from-green-500 to-teal-600' },
    { icon: Dumbbell, label: 'Equipment Pieces', value: `${animatedStats.equipment}+`, color: 'from-orange-500 to-red-600' },
    { icon: Trophy, label: 'Years Experience', value: `${animatedStats.years}+`, color: 'from-purple-500 to-pink-600' }
  ];

  const values = [
    {
      icon: Target,
      title: 'Excellence',
      description: 'We strive for excellence in every aspect of our service, from equipment to customer care.',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: Heart,
      title: 'Community',
      description: 'Building a supportive community where everyone feels welcome and motivated.',
      color: 'from-pink-500 to-rose-600'
    },
    {
      icon: Shield,
      title: 'Safety',
      description: 'Your safety and well-being are our top priorities in everything we do.',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Continuously evolving with the latest fitness technology and training methods.',
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black py-20 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary rounded-full filter blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-400 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">About FitGym Pro</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto animate-fade-in-delay">
            For over a decade, FitGym Pro has been the premier fitness destination, 
            helping thousands achieve their health and fitness goals through 
            state-of-the-art facilities and expert guidance.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        {/* Animated Stats Section */}
        <section className="py-16 -mt-10 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <Card key={index} className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${achievement.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <achievement.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {achievement.value}
                  </div>
                  <div className="text-muted-foreground">{achievement.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20">
          <Card className="gym-card-gradient border-border relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-8 md:p-12 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Founded in 2014, FitGym Pro began with a simple mission: to create a fitness 
                      environment where everyone feels welcome, supported, and empowered to reach 
                      their full potential.
                    </p>
                    <p>
                      What started as a single location has grown into a network of premium fitness 
                      centers across the region, setting the standard for fitness excellence.
                    </p>
                    <p>
                      Our commitment to excellence is reflected in every aspect of our facilities, 
                      from cutting-edge equipment to our team of certified professionals.
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop"
                    alt="FitGym Pro facility"
                    className="rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Values Section */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-16">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card 
                key={index} 
                className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group cursor-pointer transform hover:scale-105"
              >
                <CardContent className="p-6 text-center relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  <div className="relative z-10">
                    <div className="relative mb-4">
                      <value.icon className="h-12 w-12 text-primary mx-auto transition-all duration-500 group-hover:scale-125 group-hover:rotate-12" />
                      <div className="absolute inset-0 bg-primary/20 rounded-full filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-sm">
                      {value.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-16">Meet Our Expert Team</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="gym-card-gradient">
                  <CardContent className="p-6">
                    <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4 animate-pulse" />
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {staff.map((member) => (
                <Card key={member.id} className="gym-card-gradient border-border hover:border-primary transition-all duration-500 group transform hover:scale-105">
                  <CardContent className="p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{member.name}</h3>
                      <Badge variant="secondary" className="mb-4">{member.role}</Badge>
                      <div className="space-y-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                        <p><strong>Specialization:</strong> {member.specialization}</p>
                        <p><strong>Experience:</strong> {member.experience_years} years</p>
                        <div>
                          <strong>Certifications:</strong>
                          <div className="flex flex-wrap gap-1 mt-1 justify-center">
                            {member.certifications.map((cert, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Equipment Section */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-16">State-of-the-Art Equipment</h2>
          <Card className="gym-card-gradient border-border relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <CardContent className="p-8 md:p-12 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="group/item">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/item:scale-110 transition-transform duration-300">
                    <Dumbbell className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover/item:text-primary transition-colors duration-300">Strength Training</h3>
                  <p className="text-muted-foreground group-hover/item:text-foreground transition-colors duration-300">
                    Premium free weights, resistance machines, and functional training equipment 
                    from industry-leading manufacturers.
                  </p>
                </div>
                <div className="group/item">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/item:scale-110 transition-transform duration-300">
                    <Heart className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover/item:text-primary transition-colors duration-300">Cardio Zone</h3>
                  <p className="text-muted-foreground group-hover/item:text-foreground transition-colors duration-300">
                    Latest cardio equipment including treadmills, ellipticals, bikes, and 
                    rowing machines with entertainment systems.
                  </p>
                </div>
                <div className="group/item">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover/item:scale-110 transition-transform duration-300">
                    <Zap className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover/item:text-primary transition-colors duration-300">Functional Training</h3>
                  <p className="text-muted-foreground group-hover/item:text-foreground transition-colors duration-300">
                    Dedicated spaces for functional movements, TRX training, battle ropes, 
                    and group fitness classes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
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

export default About;