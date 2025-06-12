
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Users, MapPin, Award } from 'lucide-react';
import { db } from '@/lib/supabase';
import type { GymStaff } from '@/types';

const About = () => {
  const [staff, setStaff] = useState<GymStaff[]>([]);
  const [loading, setLoading] = useState(true);

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
    { icon: Users, label: 'Active Members', value: '5,000+' },
    { icon: MapPin, label: 'Locations', value: '15+' },
    { icon: Dumbbell, label: 'Equipment Pieces', value: '500+' },
    { icon: Award, label: 'Years Experience', value: '10+' }
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About FitGym Pro</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            For over a decade, FitGym Pro has been the premier fitness destination, 
            helping thousands achieve their health and fitness goals through 
            state-of-the-art facilities and expert guidance.
          </p>
        </div>

        {/* Story Section */}
        <div className="mb-20">
          <Card className="gym-card-gradient border-border">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
              <div className="prose prose-lg max-w-4xl mx-auto text-muted-foreground">
                <p className="mb-6">
                  Founded in 2014, FitGym Pro began with a simple mission: to create a fitness 
                  environment where everyone feels welcome, supported, and empowered to reach 
                  their full potential. What started as a single location has grown into a 
                  network of premium fitness centers across the region.
                </p>
                <p className="mb-6">
                  Our commitment to excellence is reflected in every aspect of our facilities, 
                  from cutting-edge equipment to our team of certified professionals. We believe 
                  that fitness is not just about physical transformation—it's about building 
                  confidence, creating community, and improving quality of life.
                </p>
                <p>
                  Today, FitGym Pro continues to set the standard for fitness excellence, 
                  constantly evolving to meet the diverse needs of our growing community while 
                  maintaining the personal touch that makes us special.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <Card key={index} className="gym-card-gradient border-border hover:border-primary transition-colors">
                <CardContent className="p-6 text-center">
                  <achievement.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-primary mb-2">
                    {achievement.value}
                  </div>
                  <div className="text-muted-foreground">{achievement.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Expert Team</h2>
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
                <Card key={member.id} className="gym-card-gradient border-border hover:border-primary transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                    <Badge variant="secondary" className="mb-4">{member.role}</Badge>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>Specialization:</strong> {member.specialization}</p>
                      <p><strong>Experience:</strong> {member.experience_years} years</p>
                      <div>
                        <strong>Certifications:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.certifications.map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Equipment Section */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-12">State-of-the-Art Equipment</h2>
          <Card className="gym-card-gradient border-border">
            <CardContent className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <Dumbbell className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Strength Training</h3>
                  <p className="text-muted-foreground">
                    Premium free weights, resistance machines, and functional training equipment 
                    from industry-leading manufacturers.
                  </p>
                </div>
                <div>
                  <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Cardio Zone</h3>
                  <p className="text-muted-foreground">
                    Latest cardio equipment including treadmills, ellipticals, bikes, and 
                    rowing machines with entertainment systems.
                  </p>
                </div>
                <div>
                  <Award className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Functional Training</h3>
                  <p className="text-muted-foreground">
                    Dedicated spaces for functional movements, TRX training, battle ropes, 
                    and group fitness classes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default About;
