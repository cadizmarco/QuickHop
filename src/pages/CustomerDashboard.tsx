import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleMapComponent } from '@/components/GoogleMapComponent';
import { LogOut, Package, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mock delivery data
  const delivery = {
    id: 'DEL-001',
    status: 'in_transit',
    pickupAddress: '123 Business St, Manila',
    deliveryAddress: '456 Home Ave, Quezon City',
    estimatedArrival: '2:30 PM',
    riderName: 'Juan Dela Cruz',
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
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Delivery #{delivery.id}</CardTitle>
                <CardDescription>Track your parcel in real-time</CardDescription>
              </div>
              <Badge className="bg-warning text-warning-foreground">
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
                  <p className="text-sm text-muted-foreground">{delivery.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">{delivery.deliveryAddress}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm font-medium">Estimated Arrival</p>
                <p className="text-sm text-muted-foreground">{delivery.estimatedArrival}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Tracking</CardTitle>
            <CardDescription>Follow your rider: {delivery.riderName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-lg overflow-hidden">
              <GoogleMapComponent 
                apiKey=""
                showRoute
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

