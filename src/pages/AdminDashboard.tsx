import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleMapComponent } from '@/components/GoogleMapComponent';
import { LogOut, Package, Truck, CheckCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const stats = [
    { label: 'Total Deliveries', value: '145', icon: Package, color: 'text-primary' },
    { label: 'Active Riders', value: '23', icon: Truck, color: 'text-secondary' },
    { label: 'Completed Today', value: '87', icon: CheckCircle, color: 'text-success' },
    { label: 'Pending', value: '12', icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">QuickHop Admin</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Live Delivery Map</CardTitle>
            <CardDescription>Real-time tracking of all active deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-lg overflow-hidden">
              <GoogleMapComponent 
                apiKey=""
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
