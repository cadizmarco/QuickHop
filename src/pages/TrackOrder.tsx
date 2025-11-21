import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Truck, User, Building2, Search, Phone, Mail, Clock, Package, Navigation } from 'lucide-react';
import { trackDeliveryByTrackingNumber } from '@/lib/deliveryService';
import { toast } from 'sonner';

const TrackOrder = () => {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [trackingData, setTrackingData] = useState<any>(null);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) return;

        setLoading(true);
        try {
            const data = await trackDeliveryByTrackingNumber(trackingNumber);
            if (data) {
                setTrackingData(data);
            } else {
                toast.error('Tracking number not found');
                setTrackingData(null);
            }
        } catch (error) {
            console.error('Tracking error:', error);
            toast.error('Failed to track delivery');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'assigned': return 'bg-blue-500';
            case 'picked_up': return 'bg-purple-500';
            case 'in_transit': return 'bg-indigo-500';
            case 'delivered': return 'bg-green-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            {/* Navbar */}
            <header className="border-b bg-card/50 backdrop-blur shrink-0">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">QuickHop</h1>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => window.location.href = '/'}>Home</Button>
                        <Button onClick={() => window.location.href = '/login'}>Get Started</Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-6 lg:p-8">
                {/* Left Sidebar */}
                <div className="w-full md:w-[400px] flex flex-col gap-6 shrink-0">

                    {/* Header Card */}
                    <Card className="border-none shadow-sm">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                                <Package className="w-6 h-6 text-blue-500" />
                            </div>
                            <h1 className="text-xl font-bold mb-1">Track Your Order</h1>
                            <p className="text-sm text-muted-foreground">Enter your tracking number to see real-time updates</p>
                        </CardContent>
                    </Card>

                    {/* Input Card */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Search className="w-4 h-4 text-blue-500" />
                                Tracking Number
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleTrack} className="space-y-4">
                                <Input
                                    placeholder="Enter tracking number..."
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    className="bg-gray-50/50"
                                />
                                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
                                    {loading ? 'Tracking...' : 'Track Order'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Results Section */}
                    {trackingData && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Status Card */}
                            <Card className="border-none shadow-sm overflow-hidden">
                                <div className={`h-1.5 w-full ${getStatusColor(trackingData.dropOff.status)}`} />
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base">Current Status</CardTitle>
                                        <Badge variant="secondary" className="font-normal">
                                            {formatStatus(trackingData.dropOff.status)}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs">
                                        Last updated: {new Date().toLocaleTimeString()}
                                    </CardDescription>
                                </CardHeader>

                                {/* Delivery Details */}
                                <CardContent className="space-y-4 pt-2">
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                                                <p className="text-sm leading-tight">{trackingData.delivery.pickup_address}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-50" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-muted-foreground">Drop-off</p>
                                                <p className="text-sm leading-tight">{trackingData.dropOff.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Rider Info */}
                                    {trackingData.rider && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{trackingData.rider.name}</p>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{trackingData.rider.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Business Info */}
                                    {trackingData.business && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{trackingData.business.name}</p>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Mail className="w-3 h-3" />
                                                    <span>Contact Support</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Right Side - Map Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border p-1 relative overflow-hidden min-h-[500px]">
                    <div className="absolute inset-0 m-1 bg-gray-50 rounded-lg flex items-center justify-center">
                        {trackingData ? (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Navigation className="w-8 h-8 text-blue-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Live Tracking Map</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                                    Map visualization would be embedded here showing the route from pickup to drop-off.
                                </p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border text-sm">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Live Updates Active
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <MapPin className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">Ready to Track</h3>
                                <p className="text-sm text-muted-foreground">
                                    Enter a tracking number to view the delivery route
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackOrder;
