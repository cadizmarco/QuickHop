import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Package, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      // Don't show success toast here - wait for user to be loaded
      // The navigation will happen automatically through the useEffect below
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
      setIsSubmitting(false);
    }
    // Note: Don't set isSubmitting to false here - let it stay true until user is loaded
    // This keeps the button disabled while the profile is being fetched
  };

  // Redirect based on role after successful login
  // Only redirect when user is loaded AND we're not currently submitting
  useEffect(() => {
    if (user && !loading && isSubmitting) {
      const routes: Record<UserRole, string> = {
        admin: '/admin',
        customer: '/customer',
        business: '/business',
        rider: '/rider',
      };
      toast.success(`Welcome back, ${user.name}!`);
      navigate(routes[user.role]);
      setIsSubmitting(false);
    }
  }, [user, loading, isSubmitting, navigate]);

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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || loading}
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
                disabled={isSubmitting || loading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
              {(isSubmitting || loading) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {loading ? 'Loading profile...' : 'Signing in...'}
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Test Accounts</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground font-semibold">Use these accounts for testing:</p>
              <div className="grid gap-1">
                <p className="font-mono">
                  <span className="text-muted-foreground">Business:</span> business@quickhop.com
                </p>
                <p className="font-mono">
                  <span className="text-muted-foreground">Rider:</span> rider@quickhop.com
                </p>
                <p className="font-mono">
                  <span className="text-muted-foreground">Customer:</span> customer@quickhop.com
                </p>
                <p className="font-mono">
                  <span className="text-muted-foreground">Admin:</span> admin@quickhop.com
                </p>
                <p className="text-muted-foreground mt-2">
                  Password for all accounts: <span className="font-mono">password123</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2 border-t">
              Your role is determined by your account. If you don't have an account, please contact an administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
