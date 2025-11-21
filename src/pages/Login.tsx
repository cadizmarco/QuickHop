import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/delivery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Package, Truck, Building2, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await login(email, password, selectedRole);
      toast.success('Login successful!');
      
      // Redirect based on role
      const routes: Record<UserRole, string> = {
        admin: '/admin',
        customer: '/customer',
        business: '/business',
        rider: '/rider',
      };
      navigate(routes[selectedRole]);
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
  };

  const roleInfo: Record<UserRole, { icon: any; title: string; description: string }> = {
    admin: {
      icon: Shield,
      title: 'Admin',
      description: 'Monitor all deliveries and manage riders',
    },
    customer: {
      icon: Package,
      title: 'Customer',
      description: 'Track your parcels in real-time',
    },
    business: {
      icon: Building2,
      title: 'Business',
      description: 'Book deliveries with multiple drop-offs',
    },
    rider: {
      icon: Truck,
      title: 'Rider',
      description: 'Accept bookings and deliver parcels',
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to QuickHop</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
              <TabsList className="grid w-full grid-cols-4">
                {(Object.keys(roleInfo) as UserRole[]).map((role) => {
                  const Icon = roleInfo[role].icon;
                  return (
                    <TabsTrigger key={role} value={role} className="flex flex-col gap-1 py-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs capitalize">{role}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {(Object.keys(roleInfo) as UserRole[]).map((role) => {
                const Icon = roleInfo[role].icon;
                return (
                  <TabsContent key={role} value={role} className="mt-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Icon className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm">{roleInfo[role].title}</h4>
                        <p className="text-xs text-muted-foreground">{roleInfo[role].description}</p>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Sign In as {roleInfo[selectedRole].title}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Demo mode: Use any email and password to login
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
