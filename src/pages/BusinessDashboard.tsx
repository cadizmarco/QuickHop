import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Package, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BusinessDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateDelivery = () => {
    toast.success('Delivery booking created successfully!');
    setIsDialogOpen(false);
  };

  // Mock deliveries
  const deliveries = [
    { id: 'DEL-001', status: 'in_transit', dropOffs: 3, date: '2024-01-15' },
    { id: 'DEL-002', status: 'pending', dropOffs: 5, date: '2024-01-15' },
    { id: 'DEL-003', status: 'delivered', dropOffs: 2, date: '2024-01-14' },
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
              <h1 className="text-xl font-bold">QuickHop Business</h1>
              <p className="text-sm text-muted-foreground">{user?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">My Deliveries</h2>
            <p className="text-muted-foreground">Manage your delivery bookings</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Delivery</DialogTitle>
                <DialogDescription>
                  Book a delivery with multiple drop-off points
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Pickup Address</Label>
                  <Input placeholder="Enter pickup location" />
                </div>
                <div className="space-y-2">
                  <Label>Drop-off Addresses</Label>
                  <Input placeholder="Customer 1 address" className="mb-2" />
                  <Input placeholder="Customer 2 address" className="mb-2" />
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Drop-off
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Date & Time</Label>
                  <Input type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input placeholder="Special instructions" />
                </div>
              </div>
              <Button onClick={handleCreateDelivery} className="w-full">
                Create Booking
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Delivery #{delivery.id}</CardTitle>
                    <CardDescription>{delivery.date}</CardDescription>
                  </div>
                  <Badge 
                    className={
                      delivery.status === 'delivered' ? 'bg-success' :
                      delivery.status === 'in_transit' ? 'bg-warning' :
                      'bg-muted'
                    }
                  >
                    {delivery.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {delivery.dropOffs} drop-off locations
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
