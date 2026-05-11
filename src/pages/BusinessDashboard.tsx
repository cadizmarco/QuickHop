import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Package, Plus, MapPin, Eye, EyeOff, Navigation, Loader2, CheckCircle2, Wand2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RouteViewer } from '@/components/RouteViewer';
import { toast } from 'sonner';
import { createDelivery, createDeliveryRequest, getDeliveriesByBusiness, subscribeToDeliveries, markDropOffDelivered, type DeliveryWithDropOffs } from '@/lib/deliveryService';
import {
  reorderDropOffsByDistance,
  formatDistance,
  type DropOffDistance,
} from '@/lib/dropOffOptimizer';

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
  const [markingDropOff, setMarkingDropOff] = useState<string | null>(null);

  // New Delivery Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropOffs, setDropOffs] = useState<DropOffInput[]>([
    { id: '1', customerName: '', customerPhone: '', customerEmail: '', address: '' },
    { id: '2', customerName: '', customerPhone: '', customerEmail: '', address: '' },
  ]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showRoutePreview, setShowRoutePreview] = useState(false);

  // Distance Analyzer State
  const [analyzing, setAnalyzing] = useState(false);
  const [autoSort, setAutoSort] = useState(true);
  // Map of drop-off id -> distance info (filled after analysis)
  const [distanceByDropOff, setDistanceByDropOff] = useState<Record<string, DropOffDistance<DropOffInput>>>({});

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
    setDistanceByDropOff({});
  };

  const removeDropOff = (id: string) => {
    if (dropOffs.length > 1) {
      setDropOffs(dropOffs.filter(d => d.id !== id));
      setDistanceByDropOff(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const updateDropOff = (id: string, field: keyof DropOffInput, value: string) => {
    setDropOffs(dropOffs.map(d =>
      d.id === id ? { ...d, [field]: value } : d
    ));
    if (field === 'address') {
      // Address changed — previous distance measurements are stale.
      setDistanceByDropOff(prev => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  /**
   * Analyze driving distance from pickup to each drop-off and
   * (optionally) reorder them nearest -> farthest. Returns the
   * (possibly reordered) drop-offs so callers can chain it with
   * a submit action without waiting for state to flush.
   */
  const analyzeDistances = async (
    options: { applySort?: boolean; silent?: boolean } = {}
  ): Promise<DropOffInput[] | null> => {
    const { applySort = true, silent = false } = options;

    if (!pickupAddress.trim()) {
      if (!silent) toast.error('Please enter a pickup address first');
      return null;
    }
    const filled = dropOffs.filter(d => d.address.trim());
    if (filled.length === 0) {
      if (!silent) toast.error('Please enter at least one drop-off address');
      return null;
    }
    if (filled.length === 1) {
      // Nothing to reorder — just measure the single stop.
    }

    setAnalyzing(true);
    const toastId = silent ? undefined : toast.loading('Analyzing route distances...');

    try {
      const result = await reorderDropOffsByDistance(pickupAddress, dropOffs);

      const distMap: Record<string, DropOffDistance<DropOffInput>> = {};
      result.details.forEach(d => {
        distMap[d.item.id] = d;
      });
      setDistanceByDropOff(distMap);

      const errorCount = result.details.filter(d => d.status === 'ERROR').length;

      if (applySort && result.changed) {
        setDropOffs(result.ordered);
        if (!silent) {
          toast.success(
            <div className="space-y-1">
              <p className="font-semibold">Drop-offs reordered: nearest → farthest</p>
              <p className="text-xs">
                {result.movedCount} stop{result.movedCount > 1 ? 's were' : ' was'} moved.
                {errorCount > 0 && ` (${errorCount} address could not be measured)`}
              </p>
            </div>,
            { id: toastId, duration: 4000 }
          );
        }
        return result.ordered;
      }

      if (!silent) {
        if (result.changed) {
          toast.message('Order is sub-optimal', {
            id: toastId,
            description: `${result.movedCount} stop(s) would move if auto-sorted.`,
          });
        } else {
          toast.success('Drop-offs are already in optimal order', { id: toastId });
        }
      }
      return dropOffs;
    } catch (error) {
      console.error('Distance analyzer failed:', error);
      if (!silent) {
        const message = error instanceof Error ? error.message : 'Could not analyze distances';
        toast.error(message, { id: toastId });
      }
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePreviewRoute = async () => {
    if (!pickupAddress || !dropOffs[0].address) {
      toast.error('Please enter at least pickup address and first drop-off location');
      return;
    }
    // Run a silent analysis so distance badges show up alongside the preview.
    // Only auto-reorder when the toggle is on.
    await analyzeDistances({ applySort: autoSort, silent: true });
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
      // If auto-sort is on, ensure the order is nearest -> farthest before
      // we persist the sequence to the database.
      let workingDropOffs = dropOffs;
      if (autoSort && dropOffs.filter(d => d.address.trim()).length > 1) {
        const sorted = await analyzeDistances({ applySort: true, silent: true });
        if (sorted) workingDropOffs = sorted;
      }

      const validDropOffs = workingDropOffs.filter(d => d.address && d.customerName);

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
      setDistanceByDropOff({});

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

  const handleMarkDelivered = async (dropOffId: string) => {
    if (!user) {
      toast.error('You must be logged in to update deliveries');
      return;
    }

    setMarkingDropOff(dropOffId);
    try {
      await markDropOffDelivered(dropOffId);
      const updatedDeliveries = await getDeliveriesByBusiness(user.id);
      setDeliveries(updatedDeliveries);

      toast.success('Drop-off marked as delivered');
    } catch (error: any) {
      console.error('Error marking drop-off delivered:', error);
      toast.error(error.message || 'Failed to update drop-off');
    } finally {
      setMarkingDropOff(null);
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
                    onChange={(e) => {
                      setPickupAddress(e.target.value);
                      setDistanceByDropOff({});
                    }}
                  />
                </div>

                {/* Drop-off Addresses */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-secondary" />
                    Drop-off Locations <span className="text-destructive">*</span>
                  </Label>
                  {dropOffs.map((dropOff, idx) => {
                    const dist = distanceByDropOff[dropOff.id];
                    const isNearest = idx === 0 && dist?.status === 'OK' && dropOffs.length > 1;
                    const isFarthest =
                      idx === dropOffs.length - 1 && dist?.status === 'OK' && dropOffs.length > 1;
                    return (
                    <Card key={dropOff.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">Drop-off {idx + 1}</h4>
                            {dist?.status === 'OK' && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                <Navigation className="w-3 h-3 mr-1" />
                                {formatDistance(dist.distanceMeters)}
                                <span className="ml-1 text-muted-foreground">from pickup</span>
                              </Badge>
                            )}
                            {dist?.status === 'ERROR' && (
                              <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Distance unknown
                              </Badge>
                            )}
                            {isNearest && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs">Nearest</Badge>
                            )}
                            {isFarthest && (
                              <Badge variant="outline" className="text-xs">Farthest</Badge>
                            )}
                          </div>
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
                    );
                  })}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={addDropOff}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Drop-off
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeDistances({ applySort: true })}
                      disabled={analyzing || !pickupAddress.trim() || dropOffs.filter(d => d.address.trim()).length < 2}
                      title="Measure distance from pickup to each stop and reorder nearest → farthest"
                    >
                      {analyzing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Wand2 className="w-4 h-4 mr-2" /> Smart Sort: Nearest → Farthest</>
                      )}
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={autoSort}
                      onChange={(e) => setAutoSort(e.target.checked)}
                    />
                    Auto-sort drop-offs by distance from pickup before submitting
                  </label>
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
                          {delivery.status === 'pending' ? 'PENDING RIDER ACCEPTANCE' : 
                           delivery.status === 'picked_up' ? 'ACCEPTED & PICKED UP' :
                           delivery.status.replace('_', ' ').toUpperCase()}
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
                                {dropOff.tracking_number && (
                                  <p className="text-xs font-mono font-semibold text-primary mt-1">
                                    📦 {dropOff.tracking_number}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {dropOff.status}
                                </Badge>
                                {dropOff.status !== 'delivered' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkDelivered(dropOff.id)}
                                    disabled={markingDropOff === dropOff.id}
                                  >
                                    {markingDropOff === dropOff.id ? (
                                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Marking...</>
                                    ) : (
                                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Mark Delivered</>
                                    )}
                                  </Button>
                                )}
                              </div>
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
