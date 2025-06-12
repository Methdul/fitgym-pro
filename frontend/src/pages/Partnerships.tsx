
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Utensils, ShoppingBag, Heart, Car, ExternalLink } from 'lucide-react';
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
        return 'bg-green-500/10 text-green-500';
      case 'retail':
        return 'bg-blue-500/10 text-blue-500';
      case 'wellness':
        return 'bg-pink-500/10 text-pink-500';
      case 'automotive':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Our Partnerships</h1>
            <p className="text-xl text-muted-foreground">
              Exclusive benefits for FitGym Pro members
            </p>
          </div>
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
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Our Partnerships</h1>
          <p className="text-xl text-muted-foreground">
            Exclusive benefits and discounts for FitGym Pro members
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {partnerships.map((partnership) => {
            const IconComponent = getCategoryIcon(partnership.category);
            return (
              <Card key={partnership.id} className="gym-card-gradient border-border hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(partnership.category)}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{partnership.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {partnership.category.charAt(0).toUpperCase() + partnership.category.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    {partnership.description}
                  </p>
                  
                  <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                    <h4 className="font-semibold text-primary mb-1">Member Benefits:</h4>
                    <p className="text-sm">{partnership.benefits}</p>
                  </div>

                  {partnership.website_url && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={partnership.website_url} target="_blank" rel="noopener noreferrer">
                        Visit Website
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {partnerships.length === 0 && !loading && (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No partnerships available</h3>
            <p className="text-muted-foreground">
              We're working on bringing you exciting partner benefits. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Partnerships;
