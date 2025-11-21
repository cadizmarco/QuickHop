import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, Building2, Shield, MapPin, Zap } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const roles = [
    {
      icon: Package,
      title: 'Customer',
      description: 'Track your parcels in real-time with live map updates',
      color: 'bg-primary',
    },
    {
      icon: Building2,
      title: 'Business',
      description: 'Book deliveries with multiple drop-off points',
      color: 'bg-secondary',
    },
    {
      icon: Truck,
      title: 'Rider',
      description: 'Accept bookings and navigate optimized routes',
      color: 'bg-success',
    },
    {
      icon: Shield,
      title: 'Admin',
      description: 'Monitor all deliveries and manage the entire fleet',
      color: 'bg-warning',
    },
  ];

  const features = [
    {
      icon: MapPin,
      title: 'Real-time Tracking',
      description: 'Live GPS tracking for all deliveries',
    },
    {
      icon: Zap,
      title: 'Multiple Drop-offs',
      description: 'Efficient routing for multiple destinations',
    },
    {
      icon: Package,
      title: 'Instant Booking',
      description: 'Quick and easy delivery scheduling',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">QuickHop</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate('/track')}>Track Order</Button>
            <Button onClick={() => navigate('/login')}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-16">
        <section className="text-center space-y-4 py-12">
          <h1 className="text-5xl font-bold tracking-tight">
            Real-time Delivery Tracking
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track your parcels from pickup to delivery with live map updates and multiple drop-off support
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <Button size="lg" onClick={() => navigate('/signup/rider')} variant="default">
              Sign Up as Rider
            </Button>
            <Button size="lg" onClick={() => navigate('/signup/business')} variant="outline">
              Sign Up as Business Owner
            </Button>
          </div>
        </section>

        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Built for Everyone</h2>
            <p className="text-muted-foreground">Choose your role and get started</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => (
              <Card key={role.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center mb-4`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{role.title}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Key Features</h2>
            <p className="text-muted-foreground">Everything you need for efficient deliveries</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2024 QuickHop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
