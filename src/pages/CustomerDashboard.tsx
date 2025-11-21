import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RouteViewer } from '@/components/RouteViewer';
import { LogOut, Package, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ============================================
  // BACKEND INTEGRATION POINT - Customer receives delivery info
  // ============================================
  // In real implementation, this would fetch from API:
  // useEffect(() => {
  //   async function fetchDelivery() {
  //     // Option 1: Track by phone (no login required)
  //     const response = await fetch(`/api/deliveries/track?phone=${user.phone}`);
  //     // Option 2: Track by authenticated user
  //     // const response = await fetch(`/api/customers/${user.id}/deliveries/active`);
  //     
  //     const data = await response.json();
  //     setDelivery(data.delivery);
  //   }
  //   fetchDelivery();
  //   const interval = setInterval(fetchDelivery, 15000); // Poll every 15s for real-time tracking
  //   return () => clearInterval(interval);
  // }, [user.phone]);
  //
  // The customer receives this data automatically when:
  // 1. Business creates delivery and includes customer info in drop-offs
  // 2. Backend creates customer notification record
  // 3. Customer receives SMS/Email with tracking link
  // 4. Customer can track delivery using phone number
  // 5. Shows their specific delivery address and route from business
  // ============================================

  // Mock delivery data - This represents data received from backend
  const delivery = {
    id: 'DEL-001',
    status: 'in_transit',
    businessName: 'ABC Store',
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
                <CardDescription>From {delivery.businessName} - Track your parcel in real-time</CardDescription>
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
                  <p className="text-sm font-medium">Your Delivery Address</p>
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

        <div className="h-[500px]">
          <RouteViewer
            startLocation={delivery.pickupAddress}
            endLocation={delivery.deliveryAddress}
            showMap={true}
          />
        </div>
      </main>
    </div>
  );
}

