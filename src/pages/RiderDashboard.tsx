import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleMapComponent } from '@/components/GoogleMapComponent';
import { LogOut, Package, MapPin, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Mock active delivery
  const activeDelivery = {
    id: 'DEL-001',
    businessName: 'ABC Store',
    pickupAddress: '123 Business St, Manila',
    dropOffs: [
      { name: 'John Doe', address: '456 Home Ave, Quezon City', status: 'pending' },
      { name: 'Jane Smith', address: '789 Apartment Rd, Makati', status: 'pending' },
    ],
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
              <h1 className="text-xl font-bold">QuickHop Rider</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
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
                <CardTitle>Active Delivery #{activeDelivery.id}</CardTitle>
                <CardDescription>From {activeDelivery.businessName}</CardDescription>
              </div>
              <Badge className="bg-warning text-warning-foreground">IN TRANSIT</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pickup Location</p>
                  <p className="text-sm text-muted-foreground">{activeDelivery.pickupAddress}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>

              {activeDelivery.dropOffs.map((dropOff, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Drop-off {idx + 1}: {dropOff.name}</p>
                    <p className="text-sm text-muted-foreground">{dropOff.address}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Mark Delivered
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Route Navigation</CardTitle>
            <CardDescription>Follow the optimized route to all drop-off locations</CardDescription>
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
