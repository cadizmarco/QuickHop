import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RouteViewer } from '@/components/RouteViewer';
import { LogOut, Package, MapPin, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDropOffIndex, setCurrentDropOffIndex] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ============================================
  // BACKEND INTEGRATION POINT - Rider receives assigned delivery
  // ============================================
  // In real implementation, this would fetch from API:
  // useEffect(() => {
  //   async function fetchActiveDelivery() {
  //     const response = await fetch(`/api/riders/${user.id}/deliveries/active`);
  //     const data = await response.json();
  //     setActiveDelivery(data.activeDelivery);
  //   }
  //   fetchActiveDelivery();
  //   const interval = setInterval(fetchActiveDelivery, 30000); // Poll every 30s
  //   return () => clearInterval(interval);
  // }, [user.id]);
  //
  // The backend automatically assigns this delivery when business creates it:
  // 1. Business creates delivery with pickup + multiple drop-offs
  // 2. Backend finds available rider (this user)
  // 3. Backend assigns delivery to rider
  // 4. Rider receives notification
  // 5. Delivery appears here with complete route information
  // ============================================

  // Mock active delivery - This represents data received from backend
  const activeDelivery = {
    id: 'DEL-001',
    businessName: 'ABC Store',
    pickupAddress: '123 Business St, Manila',
    dropOffs: [
      { name: 'John Doe', address: '456 Home Ave, Quezon City', status: 'pending' },
      { name: 'Jane Smith', address: '789 Apartment Rd, Makati', status: 'pending' },
    ],
  };

  // Determine the current route with all remaining waypoints
  const getCurrentRoute = () => {
    const pendingDropOffs = activeDelivery.dropOffs.filter(d => d.status === 'pending');
    
    if (pendingDropOffs.length === activeDelivery.dropOffs.length) {
      // All pending, show complete route from pickup through all drop-offs
      return {
        from: activeDelivery.pickupAddress,
        to: activeDelivery.dropOffs[activeDelivery.dropOffs.length - 1].address,
        waypoints: activeDelivery.dropOffs.slice(0, -1).map(d => d.address),
      };
    } else if (pendingDropOffs.length > 0) {
      // Some delivered, show route from current location through remaining drop-offs
      const lastDeliveredIndex = activeDelivery.dropOffs.findLastIndex(d => d.status !== 'pending');
      const nextPendingIndex = lastDeliveredIndex + 1;
      const remainingDropOffs = activeDelivery.dropOffs.slice(nextPendingIndex);
      
      return {
        from: activeDelivery.dropOffs[lastDeliveredIndex]?.address || activeDelivery.pickupAddress,
        to: remainingDropOffs[remainingDropOffs.length - 1].address,
        waypoints: remainingDropOffs.slice(0, -1).map(d => d.address),
      };
    }
    
    // All delivered, show complete route for reference
    return {
      from: activeDelivery.pickupAddress,
      to: activeDelivery.dropOffs[activeDelivery.dropOffs.length - 1].address,
      waypoints: activeDelivery.dropOffs.slice(0, -1).map(d => d.address),
    };
  };

  const currentRoute = getCurrentRoute();
  const pendingCount = activeDelivery.dropOffs.filter(d => d.status === 'pending').length;

  const handleMarkDelivered = (index: number) => {
    // In real implementation, this would update the delivery status
    console.log(`Marking drop-off ${index} as delivered`);
    setCurrentDropOffIndex(index + 1);
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
                  {dropOff.status === 'pending' ? (
                    <Button size="sm" variant="outline" onClick={() => handleMarkDelivered(idx)}>
                      Mark Delivered
                    </Button>
                  ) : (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Route Navigation</CardTitle>
            <CardDescription>
              {pendingCount > 0 
                ? `Optimized route through remaining ${pendingCount} stop${pendingCount > 1 ? 's' : ''}`
                : 'All deliveries completed!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <RouteViewer
                startLocation={currentRoute.from}
                endLocation={currentRoute.to}
                waypoints={currentRoute.waypoints}
                showMap={true}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
