import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Package, Plus, MapPin, Eye, EyeOff, Navigation, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RouteViewer } from '@/components/RouteViewer';
import { toast } from 'sonner';
import { createDelivery, createDeliveryRequest, getDeliveriesByBusiness, subscribeToDeliveries, type DeliveryWithDropOffs } from '@/lib/deliveryService';

interface DropOffInput {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
}

export default function BusinessDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);

  // Data State
  const [deliveries, setDeliveries] = useState<DeliveryWithDropOffs[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // New Delivery Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropOffs, setDropOffs] = useState<DropOffInput[]>([
    { id: '1', customerName: '', customerPhone: '', customerEmail: '', address: '' },
    { id: '2', customerName: '', customerPhone: '', customerEmail: '', address: '' },
  ]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showRoutePreview, setShowRoutePreview] = useState(false);

  // Fetch deliveries on mount
  useEffect(() => {
    if (!user?.id) return;

    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const data = await getDeliveriesByBusiness(user.id);
        setDeliveries(data);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        toast.error('Failed to load deliveries');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToDeliveries(user.id, (payload) => {
      console.log('Delivery updated:', payload);
      // Refetch deliveries when changes occur
      fetchDeliveries();
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const addDropOff = () => {
    setDropOffs([...dropOffs, {
      id: Date.now().toString(),
      customerName: '',
      customerPhone: '',
      customerEmail: '',
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
    if (!user) {
      toast.error('You must be logged in to create deliveries');
      return;
    }

    if (!pickupAddress || !dropOffs[0].address || !dropOffs[0].customerName) {
      toast.error('Please fill in required fields (pickup address and at least one drop-off)');
      return;
    }

    setCreating(true);
    const toastId = toast.loading('Creating delivery...');

    try {
      const validDropOffs = dropOffs.filter(d => d.address && d.customerName);

      const newDelivery = await createDelivery(
        user.id,
        user.name,
        {
          pickupAddress,
          dropOffs: validDropOffs,
          scheduledFor: scheduledDate || undefined,
          notes: notes || undefined,
        }
      );

      // Create delivery request to broadcast to riders
      await createDeliveryRequest(newDelivery.id);

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Delivery Created! #{newDelivery.id.substring(0, 8)}</p>
          <p className="text-xs">✅ {validDropOffs.length} drop-off location{validDropOffs.length > 1 ? 's' : ''} added</p>
          <p className="text-xs">📡 Broadcasting to available riders...</p>
        </div>,
        { id: toastId, duration: 5000 }
      );

      // Reset form
      setIsDialogOpen(false);
      setPickupAddress('');
      setDropOffs([
        { id: '1', customerName: '', customerPhone: '', customerEmail: '', address: '' },
        { id: '2', customerName: '', customerPhone: '', customerEmail: '', address: '' },
      ]);
      setScheduledDate('');
      setNotes('');
      setShowRoutePreview(false);

      // Refresh deliveries list
      const updatedDeliveries = await getDeliveriesByBusiness(user.id);
      setDeliveries(updatedDeliveries);
    } catch (error: any) {
      console.error('Error creating delivery:', error);
      toast.error(error.message || 'Failed to create delivery', { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  const toggleDeliveryView = (deliveryId: string) => {
    setExpandedDelivery(expandedDelivery === deliveryId ? null : deliveryId);
  };

  const handleLogoutAsync = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
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
              <h1 className="text-xl font-bold">QuickHop Business</h1>
              <p className="text-sm text-muted-foreground">{user?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogoutAsync}>
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
                          <Label className="text-xs">Customer Email</Label>
                          <Input
                            type="email"
                            placeholder="customer@example.com"
                            value={dropOff.customerEmail}
                            onChange={(e) => updateDropOff(dropOff.id, 'customerEmail', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Tracking number will be sent to this email</p>
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
                <Button onClick={handleCreateDelivery} className="flex-1" disabled={creating}>
                  {creating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Package className="w-4 h-4 mr-2" /> Create Booking</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : deliveries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deliveries yet</h3>
              <p className="text-muted-foreground mb-4">Create your first delivery to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Delivery #{delivery.id.substring(0, 8)}</CardTitle>
                      <CardDescription>{new Date(delivery.created_at).toLocaleDateString()}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          delivery.status === 'delivered' ? 'bg-success' :
                            delivery.status === 'in_transit' || delivery.status === 'picked_up' ? 'bg-warning' :
                              delivery.status === 'assigned' ? 'bg-blue-500' :
                                'bg-muted'
                        }
                      >
                        {delivery.status === 'pending' ? 'PENDING RIDER ACCEPTANCE' : delivery.status.replace('_', ' ').toUpperCase()}
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
                      <p className="text-sm text-muted-foreground">{delivery.pickup_address}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {delivery.drop_offs.length} drop-off location{delivery.drop_offs.length > 1 ? 's' : ''}
                      {delivery.rider_name && ` • Rider: ${delivery.rider_name}`}
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
                        {delivery.drop_offs.map((dropOff, idx) => (
                          <div key={dropOff.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {idx + 1}. {dropOff.customer_name}
                                </p>
                                <p className="text-xs text-muted-foreground">{dropOff.address}</p>
                                <p className="text-xs text-muted-foreground">{dropOff.customer_phone}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {dropOff.status}
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
                            startLocation={delivery.pickup_address}
                            endLocation={delivery.drop_offs[delivery.drop_offs.length - 1].address}
                            waypoints={delivery.drop_offs.slice(0, -1).map(d => d.address)}
                            showMap={true}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          🚀 Optimized route through all {delivery.drop_offs.length} drop-off locations • Fastest path highlighted
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
