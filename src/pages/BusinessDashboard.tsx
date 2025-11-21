import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Package, Plus, MapPin, Eye, EyeOff, Navigation, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RouteViewer } from '@/components/RouteViewer';
import { toast } from 'sonner';

interface DropOffInput {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
}

export default function BusinessDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  
  // New Delivery Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropOffs, setDropOffs] = useState<DropOffInput[]>([
    { id: '1', customerName: '', customerPhone: '', address: '' },
    { id: '2', customerName: '', customerPhone: '', address: '' },
  ]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showRoutePreview, setShowRoutePreview] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const addDropOff = () => {
    setDropOffs([...dropOffs, { 
      id: Date.now().toString(), 
      customerName: '', 
      customerPhone: '', 
      address: '' 
    }]);
  };

  const removeDropOff = (id: string) => {
    if (dropOffs.length > 1) {
      setDropOffs(dropOffs.filter(d => d.id !== id));
    }
  };

  const updateDropOff = (id: string, field: keyof DropOffInput, value: string) => {
    setDropOffs(dropOffs.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const handlePreviewRoute = () => {
    if (!pickupAddress || !dropOffs[0].address) {
      toast.error('Please enter at least pickup address and first drop-off location');
      return;
    }
    setShowRoutePreview(true);
  };

  const handleCreateDelivery = async () => {
    if (!pickupAddress || !dropOffs[0].address || !dropOffs[0].customerName) {
      toast.error('Please fill in required fields (pickup address and at least one drop-off)');
      return;
    }
    
    // Simulate loading state
    toast.loading('Creating delivery...');
    
    // In real implementation, this would be an API call:
    // const response = await fetch('/api/deliveries', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     businessId: user.id,
    //     businessName: user.name,
    //     pickupAddress: pickupAddress,
    //     dropOffs: dropOffs.filter(d => d.address && d.customerName),
    //     scheduledDate: scheduledDate,
    //     notes: notes,
    //     status: 'pending'
    //   })
    // });
    // const delivery = await response.json();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate delivery creation and assignment
    const newDeliveryId = `DEL-${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;
    const customerCount = dropOffs.filter(d => d.address && d.customerName).length;
    
    // Backend would:
    // 1. Create delivery record in database
    // 2. Find available rider and assign
    // 3. Send notifications to rider
    // 4. Send notifications to all customers involved
    
    toast.dismiss();
    toast.success(
      <div className="space-y-1">
        <p className="font-semibold">Delivery Created! #{newDeliveryId}</p>
        <p className="text-xs">✅ Assigned to available rider</p>
        <p className="text-xs">✅ {customerCount} customer{customerCount > 1 ? 's' : ''} notified</p>
        <p className="text-xs">📍 Route shared with all parties</p>
      </div>,
      { duration: 5000 }
    );
    
    // Reset form
    setIsDialogOpen(false);
    setPickupAddress('');
    setDropOffs([
      { id: '1', customerName: '', customerPhone: '', address: '' },
      { id: '2', customerName: '', customerPhone: '', address: '' },
    ]);
    setScheduledDate('');
    setNotes('');
    setShowRoutePreview(false);
    
    // In real app, this would trigger a refetch of deliveries list
    // to show the newly created delivery
  };

  const toggleDeliveryView = (deliveryId: string) => {
    setExpandedDelivery(expandedDelivery === deliveryId ? null : deliveryId);
  };

  // Mock deliveries with detailed information
  const deliveries = [
    { 
      id: 'DEL-001', 
      status: 'in_transit', 
      date: '2024-01-15',
      pickupAddress: '123 Business St, Manila',
      riderName: 'Juan Dela Cruz',
      dropOffs: [
        { name: 'John Doe', address: '456 Home Ave, Quezon City', phone: '+63 912 345 6789' },
        { name: 'Jane Smith', address: '789 Apartment Rd, Makati', phone: '+63 912 345 6790' },
        { name: 'Bob Johnson', address: '321 Condo Blvd, Taguig', phone: '+63 912 345 6791' },
      ]
    },
    { 
      id: 'DEL-002', 
      status: 'pending',
      date: '2024-01-15',
      pickupAddress: '123 Business St, Manila',
      riderName: null,
      dropOffs: [
        { name: 'Alice Wong', address: '555 Street Ave, Pasig', phone: '+63 912 345 6792' },
        { name: 'Carlos Garcia', address: '777 Road St, Mandaluyong', phone: '+63 912 345 6793' },
        { name: 'Diana Lopez', address: '888 Lane Rd, San Juan', phone: '+63 912 345 6794' },
        { name: 'Eric Santos', address: '999 Drive Blvd, Caloocan', phone: '+63 912 345 6795' },
        { name: 'Fiona Reyes', address: '111 Path St, Valenzuela', phone: '+63 912 345 6796' },
      ]
    },
    { 
      id: 'DEL-003', 
      status: 'delivered',
      date: '2024-01-14',
      pickupAddress: '123 Business St, Manila',
      riderName: 'Maria Santos',
      dropOffs: [
        { name: 'George Cruz', address: '222 Avenue Rd, Malabon', phone: '+63 912 345 6797' },
        { name: 'Helen Tan', address: '333 Boulevard St, Navotas', phone: '+63 912 345 6798' },
      ]
    },
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Delivery</DialogTitle>
                <DialogDescription>
                  Book a delivery with multiple drop-off points. The route will be shared with the rider and customers.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Pickup Address */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Pickup Address <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    placeholder="Enter your business/pickup location (e.g., 123 Business St, Manila)" 
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                  />
                </div>

                {/* Drop-off Addresses */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-secondary" />
                    Drop-off Locations <span className="text-destructive">*</span>
                  </Label>
                  {dropOffs.map((dropOff, idx) => (
                    <Card key={dropOff.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Drop-off {idx + 1}</h4>
                          {dropOffs.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeDropOff(dropOff.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Customer Name {idx === 0 && <span className="text-destructive">*</span>}</Label>
                            <Input 
                              placeholder="John Doe" 
                              value={dropOff.customerName}
                              onChange={(e) => updateDropOff(dropOff.id, 'customerName', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Customer Phone</Label>
                            <Input 
                              placeholder="+63 912 345 6789" 
                              value={dropOff.customerPhone}
                              onChange={(e) => updateDropOff(dropOff.id, 'customerPhone', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Delivery Address {idx === 0 && <span className="text-destructive">*</span>}</Label>
                          <Input 
                            placeholder="456 Customer St, Quezon City" 
                            value={dropOff.address}
                            onChange={(e) => updateDropOff(dropOff.id, 'address', e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button variant="outline" size="sm" onClick={addDropOff}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Drop-off
                  </Button>
                </div>

                {/* Route Preview */}
                {showRoutePreview && pickupAddress && dropOffs[0].address && (
                  <div className="space-y-2">
                    <Label>Route Preview - Optimized for All Stops</Label>
                    <div className="h-[400px]">
                      <RouteViewer
                        startLocation={pickupAddress}
                        endLocation={dropOffs[dropOffs.length - 1].address}
                        waypoints={dropOffs.slice(0, -1).map(d => d.address).filter(addr => addr.trim())}
                        showMap={true}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      🚀 Google Maps shows the fastest route through all {dropOffs.filter(d => d.address).length} drop-off locations
                    </p>
                  </div>
                )}

                {!showRoutePreview && (
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={handlePreviewRoute}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Route on Map
                  </Button>
                )}

                {/* Additional Information */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Scheduled Date & Time</Label>
                    <Input 
                      type="datetime-local" 
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input 
                      placeholder="Special instructions" 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setShowRoutePreview(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateDelivery} className="flex-1">
                  <Package className="w-4 h-4 mr-2" />
                  Create Booking
                </Button>
              </div>
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
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={
                        delivery.status === 'delivered' ? 'bg-success' :
                        delivery.status === 'in_transit' ? 'bg-warning' :
                        'bg-muted'
                      }
                    >
                      {delivery.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleDeliveryView(delivery.id)}
                    >
                      {expandedDelivery === delivery.id ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pickup Location</p>
                    <p className="text-sm text-muted-foreground">{delivery.pickupAddress}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {delivery.dropOffs.length} drop-off location{delivery.dropOffs.length > 1 ? 's' : ''}
                    {delivery.riderName && ` • Rider: ${delivery.riderName}`}
                  </p>
                </div>

                {/* Expanded View */}
                {expandedDelivery === delivery.id && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Drop-off List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        Drop-off Locations
                      </h4>
                      {delivery.dropOffs.map((dropOff, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {idx + 1}. {dropOff.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{dropOff.address}</p>
                              <p className="text-xs text-muted-foreground">{dropOff.phone}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Stop {idx + 1}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Route Map */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Complete Route Overview</h4>
                      <div className="h-[400px]">
                        <RouteViewer
                          startLocation={delivery.pickupAddress}
                          endLocation={delivery.dropOffs[delivery.dropOffs.length - 1].address}
                          waypoints={delivery.dropOffs.slice(0, -1).map(d => d.address)}
                          showMap={true}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        🚀 Optimized route through all {delivery.dropOffs.length} drop-off locations • Fastest path highlighted
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
