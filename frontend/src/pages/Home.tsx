
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Dumbbell, Users, Award, Star } from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: Dumbbell,
      title: 'State-of-the-Art Equipment',
      description: 'Latest fitness technology and premium equipment for all your workout needs.'
    },
    {
      icon: Users,
      title: 'Expert Trainers',
      description: 'Certified personal trainers ready to help you achieve your fitness goals.'
    },
    {
      icon: MapPin,
      title: 'Multiple Locations',
      description: 'Convenient locations across the city with flexible membership options.'
    },
    {
      icon: Award,
      title: 'Proven Results',
      description: 'Join thousands of satisfied members who have transformed their lives.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      text: 'FitGym Pro changed my life! The trainers are amazing and the equipment is top-notch.',
      rating: 5
    },
    {
      name: 'Mike Chen',
      text: 'Best gym experience ever. Multiple locations make it so convenient for my schedule.',
      rating: 5
    },
    {
      name: 'Emily Davis',
      text: 'The community here is incredible. I actually look forward to my workouts now!',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gym-gradient py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Your Fitness Journey Starts{' '}
            <span className="text-primary">Here</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience world-class fitness facilities across multiple locations with expert trainers 
            dedicated to your success.
          </p>
          <Button size="lg" asChild className="text-lg px-8 py-6">
            <Link to="/branches">
              <MapPin className="h-5 w-5 mr-2" />
              Find Locations
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Choose FitGym Pro?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="gym-card-gradient border-border hover:border-primary transition-colors">
                <CardContent className="p-6 text-center">
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-accent">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            What Our Members Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="gym-card-gradient border-border">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.text}"
                  </p>
                  <p className="font-semibold">{testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="gym-card-gradient border-primary">
            <CardContent className="p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Transform Your Life?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join the FitGym Pro community and start your fitness journey today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/branches">Find a Location</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/about">Learn More</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;
