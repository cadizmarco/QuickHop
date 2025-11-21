import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RouteViewer } from '@/components/RouteViewer';
import { LogOut, Package, MapPin, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { subscribeToDropOffs } from '@/lib/deliveryService';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [trackingNumber, setTrackingNumber] = useState('');
  const [delivery, setDelivery] = useState<any>(null);
  const [dropOff, setDropOff] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleLogoutAsync = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleTrackDelivery = async (number?: string) => {
    const trackNumber = number || trackingNumber;

    if (!trackNumber) {
      toast.error('Please enter a tracking number');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      // Use the new tracking function
      // Note: We need to import this function first
      const { trackDeliveryByTrackingNumber } = await import('@/lib/deliveryService');
      const data = await trackDeliveryByTrackingNumber(trackNumber);

      if (data) {
        setDelivery(data.delivery);
        setDropOff(data.dropOff);

        // Subscribe to real-time updates
        if (data.delivery?.id) {
          subscribeToDropOffs(data.delivery.id, (payload) => {
            console.log('Drop-off updated:', payload);
            // Refresh data
            handleTrackDelivery(trackNumber);
          });
        }
      } else {
        setDelivery(null);
        setDropOff(null);
        toast.info('No delivery found for this tracking number');
      }
    } catch (error: any) {
      console.error('Error tracking delivery:', error);
      toast.error(error.message || 'Failed to track delivery');
      setDelivery(null);
      setDropOff(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">QuickHop</h1>
              <p className="text-sm text-muted-foreground">Track your delivery</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogoutAsync}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Tracking Number Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Track Your Delivery</CardTitle>
            <CardDescription>Enter your tracking number to track your package</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="trackingNumber" className="sr-only">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  type="text"
                  placeholder="Enter Tracking Number (e.g., TRK-...)"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrackDelivery()}
                  disabled={loading}
                />
              </div>
              <Button onClick={() => handleTrackDelivery()} disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tracking...</>
                ) : (
                  'Track'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !delivery && hasSearched ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Delivery</h3>
              <p className="text-muted-foreground">No delivery found for this tracking number.</p>
              <p className="text-sm text-muted-foreground mt-2">Please check your tracking number and try again.</p>
            </CardContent>
          </Card>
        ) : delivery && dropOff ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Delivery #{delivery.id.substring(0, 8)}</CardTitle>
                    <CardDescription>From {delivery.business_name} - Track your parcel in real-time</CardDescription>
                  </div>
                  <Badge
                    variant={delivery.status === 'delivered' ? 'default' : 'secondary'}
                    className={delivery.status === 'in_transit' ? 'bg-yellow-500' : ''}
                  >
                    {delivery.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Pickup Location</p>
                      <p className="text-sm text-muted-foreground">{delivery.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Your Delivery Address</p>
                      <p className="text-sm text-muted-foreground">{dropOff.address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Package className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Delivery Status</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {dropOff.status === 'delivered'
                          ? `Delivered at ${new Date(dropOff.delivered_at).toLocaleTimeString()}`
                          : dropOff.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  {delivery.rider_name && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="w-5 h-5 text-warning" />
                      <div>
                        <p className="text-sm font-medium">Rider</p>
                        <p className="text-sm text-muted-foreground">{delivery.rider_name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {dropOff.status === 'delivered' && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      ✓ Your package has been delivered!
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                      Delivered on {new Date(dropOff.delivered_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Route</CardTitle>
                <CardDescription>Live tracking of your package</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <RouteViewer
                    startLocation={delivery.pickup_address}
                    endLocation={dropOff.address}
                    showMap={true}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}

