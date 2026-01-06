import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/PasswordInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Package, Loader2, ArrowLeft } from 'lucide-react';

interface SignupProps {
    role: 'rider' | 'business';
}

export default function Signup({ role }: SignupProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
    });

    const roleTitle = role === 'rider' ? 'Rider' : 'Business Owner';

    const ensureProfile = async (userId: string) => {
        // Make sure a profile row exists for the newly created auth user
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }

        if (!profile) {
            const { error: insertError } = await supabase.from('profiles').insert({
                id: userId,
                email: formData.email,
                name: formData.name,
                role,
                phone: formData.phone || null,
                is_available: role === 'rider' ? true : null,
            });

            if (insertError) {
                throw insertError;
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        role: role,
                        phone: formData.phone,
                    },
                    // Auto-confirm email for riders and business owners
                    emailRedirectTo: undefined,
                },
            });

            if (error) throw error;

            if (data.user) {
                await ensureProfile(data.user.id);
            }

            // For riders and business owners, email is auto-verified via database trigger
            // Wait a moment for the trigger to process, then check for session
            if (data.session) {
                toast.success('Account created successfully!');
                navigate(role === 'rider' ? '/rider' : '/business');
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                toast.success('Account created successfully!');
                navigate(role === 'rider' ? '/rider' : '/business');
            } else {
                toast.success('Account created! Please check your email to confirm your account.', {
                    duration: 6000,
                });
                navigate('/login');
            }
        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error(error.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-0 top-0"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                        <Package className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Sign Up as {roleTitle}</CardTitle>
                    <CardDescription>Create your QuickHop account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+63 912 345 6789"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <p className="text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
