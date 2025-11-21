import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RouteViewer } from '@/components/RouteViewer';
import { LogOut, Navigation, MapPin, Clock, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getActiveDeliveryByRider, markDropOffDelivered, updateDeliveryStatus, subscribeToDropOffs, subscribeToDeliveryRequests, getPendingDeliveryRequests, acceptDeliveryRequest, rejectDeliveryRequest, getRiderAvailability, updateRiderAvailability, type DeliveryWithDropOffs } from '@/lib/deliveryService';
import { supabase } from '@/lib/supabase';

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeDelivery, setActiveDelivery] = useState<DeliveryWithDropOffs | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingDelivered, setMarkingDelivered] = useState<string | null>(null);

  // Queue system state
  const [deliveryRequests, setDeliveryRequests] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [acceptingRequest, setAcceptingRequest] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<string | null>(null);

  const handleLogoutAsync = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
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

  // Fetch active delivery on mount
  useEffect(() => {
    if (!user?.id) return;

    const fetchActiveDelivery = async () => {
      try {
        setLoading(true);
        const delivery = await getActiveDeliveryByRider(user.id);
        setActiveDelivery(delivery);
        
        // Update availability based on whether there's an active delivery
        if (delivery) {
          // Check if all drop-offs are delivered
          const allDelivered = delivery.drop_offs.every(d => d.status === 'delivered');
          if (allDelivered) {
            // All delivered, make rider available
            await updateRiderAvailability(user.id, true);
            setIsAvailable(true);
          } else {
            // Has active delivery, make rider busy
            await updateRiderAvailability(user.id, false);
            setIsAvailable(false);
          }
        } else {
          // No active delivery, make rider available
          await updateRiderAvailability(user.id, true);
          setIsAvailable(true);
        }
      } catch (error) {
        console.error('Error fetching active delivery:', error);
        toast.error('Failed to load active delivery');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveDelivery();
  }, [user?.id]);

  // Subscribe to real-time updates for drop-offs when activeDelivery changes
  useEffect(() => {
    if (!user?.id || !activeDelivery?.id) return;

    const unsubscribeDropOffs = subscribeToDropOffs(activeDelivery.id, async (payload) => {
      console.log('Drop-off updated:', payload);
      const updatedDelivery = await getActiveDeliveryByRider(user.id);
      setActiveDelivery(updatedDelivery);
      
      // Check if all drop-offs are delivered and update availability
      if (updatedDelivery?.drop_offs.every(d => d.status === 'delivered')) {
        await updateRiderAvailability(user.id, true);
        setIsAvailable(true);
      }
    });

    // Also subscribe to delivery status changes
    const deliveryChannel = supabase
      .channel(`delivery-${activeDelivery.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${activeDelivery.id}`,
        },
        async (payload) => {
          console.log('Delivery status updated:', payload);
          // If delivery is marked as delivered, make rider available
          if (payload.new.status === 'delivered') {
            await updateRiderAvailability(user.id, true);
            setIsAvailable(true);
            const updatedDelivery = await getActiveDeliveryByRider(user.id);
            setActiveDelivery(updatedDelivery);
          }
        }
      )
      .subscribe();

    return () => {
      unsubscribeDropOffs();
      supabase.removeChannel(deliveryChannel);
    };
  }, [user?.id, activeDelivery?.id]);

  // Fetch delivery requests and subscribe to updates
  useEffect(() => {
    if (!user?.id) return;

    const fetchRequestsAndAvailability = async () => {
      try {
        // Check rider availability
        const availability = await getRiderAvailability(user.id);
        setIsAvailable(availability);

        // Only fetch requests if available
        if (availability) {
          const requests = await getPendingDeliveryRequests();
          setDeliveryRequests(requests || []);
        } else {
          setDeliveryRequests([]);
        }
      } catch (error) {
        console.error('Error fetching delivery requests:', error);
      }
    };

    fetchRequestsAndAvailability();

    // Subscribe to real-time delivery request updates
    const unsubscribe = subscribeToDeliveryRequests(async (payload) => {
      console.log('Delivery request update:', payload);

      if (payload.eventType === 'INSERT' && isAvailable) {
        // New delivery request created - fetch full details and add to list
        try {
          const requests = await getPendingDeliveryRequests();
          setDeliveryRequests(requests || []);
          
          // Show notification with delivery details
          const newRequest = requests?.find(r => r.id === payload.new.id);
          if (newRequest) {
            toast.info('🚚 New delivery available!', {
              description: `From ${newRequest.deliveries?.business_name || 'Business'}`,
              duration: 5000,
            });
          }
        } catch (error) {
          console.error('Error fetching new delivery request:', error);
        }
      } else if (payload.eventType === 'UPDATE') {
        // Request was accepted or status changed, refresh the list
        if (isAvailable) {
          try {
            const requests = await getPendingDeliveryRequests();
            setDeliveryRequests(requests || []);
          } catch (error) {
            console.error('Error refreshing delivery requests:', error);
          }
        } else {
          setDeliveryRequests([]);
        }
      } else if (payload.eventType === 'DELETE') {
        // Request was deleted, remove from list
        setDeliveryRequests(prev => prev.filter(req => req.id !== payload.old.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isAvailable]);

  // Determine the current route with all remaining waypoints
  const getCurrentRoute = () => {
    if (!activeDelivery) return null;

    const pendingDropOffs = activeDelivery.drop_offs.filter(d => d.status === 'pending');

    if (pendingDropOffs.length === activeDelivery.drop_offs.length) {
      // All pending, show complete route from pickup through all drop-offs
      return {
        from: activeDelivery.pickup_address,
        to: activeDelivery.drop_offs[activeDelivery.drop_offs.length - 1].address,
        waypoints: activeDelivery.drop_offs.slice(0, -1).map(d => d.address),
      };
    } else if (pendingDropOffs.length > 0) {
      // Some delivered, show route from current location through remaining drop-offs
      let lastDeliveredIndex = -1;
      for (let i = activeDelivery.drop_offs.length - 1; i >= 0; i--) {
        if (activeDelivery.drop_offs[i].status !== 'pending') {
          lastDeliveredIndex = i;
          break;
        }
      }
      const nextPendingIndex = lastDeliveredIndex + 1;
      const remainingDropOffs = activeDelivery.drop_offs.slice(nextPendingIndex);

      return {
        from: activeDelivery.drop_offs[lastDeliveredIndex]?.address || activeDelivery.pickup_address,
        to: remainingDropOffs[remainingDropOffs.length - 1].address,
        waypoints: remainingDropOffs.slice(0, -1).map(d => d.address),
      };
    }

    // All delivered, show complete route for reference
    return {
      from: activeDelivery.pickup_address,
      to: activeDelivery.drop_offs[activeDelivery.drop_offs.length - 1].address,
      waypoints: activeDelivery.drop_offs.slice(0, -1).map(d => d.address),
    };
  };

  const currentRoute = getCurrentRoute();
  const pendingCount = activeDelivery?.drop_offs.filter(d => d.status === 'pending').length || 0;

  const handleMarkDelivered = async (dropOffId: string, index: number) => {
    try {
      setMarkingDelivered(dropOffId);
      await markDropOffDelivered(dropOffId);

      // Refresh delivery data
      if (user?.id) {
        const updatedDelivery = await getActiveDeliveryByRider(user.id);
        setActiveDelivery(updatedDelivery);

        // Check if all drop-offs are delivered
        const allDelivered = updatedDelivery?.drop_offs.every(d => d.status === 'delivered');
        
        if (allDelivered) {
          // All drop-offs delivered - make rider available again
          await updateRiderAvailability(user.id, true);
          setIsAvailable(true);
          
          toast.success(
            <div className="space-y-1">
              <p className="font-semibold">All Deliveries Completed! 🎉</p>
              <p className="text-xs">✅ You are now available for new deliveries</p>
            </div>,
            { duration: 5000 }
          );
        } else {
          toast.success(
            <div className="space-y-1">
              <p className="font-semibold">Drop-off Completed!</p>
              <p className="text-xs">✅ Package delivered successfully</p>
              <p className="text-xs">📱 Customer notified</p>
            </div>,
            { duration: 3000 }
          );
        }
      }
    } catch (error: any) {
      console.error('Error marking drop-off as delivered:', error);
      toast.error(error.message || 'Failed to mark as delivered');
    } finally {
      setMarkingDelivered(null);
    }
  };

  const handleAcceptDelivery = async (requestId: string) => {
    if (!user) return;

    setAcceptingRequest(requestId);
    try {
      await acceptDeliveryRequest(requestId, user.id, user.name);

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Delivery Accepted!</p>
          <p className="text-xs">✅ You've claimed this delivery</p>
          <p className="text-xs">🚚 Starting navigation...</p>
        </div>,
        { duration: 3000 }
      );

      // Refresh active delivery and requests
      const updatedDelivery = await getActiveDeliveryByRider(user.id);
      setActiveDelivery(updatedDelivery);
      
      // Mark rider as busy
      await updateRiderAvailability(user.id, false);
      setIsAvailable(false);

      // Clear delivery requests since rider is now busy
      setDeliveryRequests([]);
    } catch (error: any) {
      console.error('Error accepting delivery:', error);
      if (error.message.includes('already been claimed') || error.message.includes('accepted this delivery first')) {
        toast.error('⚡ Another rider claimed this delivery first!');
      } else if (error.message.includes('already responded')) {
        toast.error('You have already responded to this request');
      } else {
        toast.error(error.message || 'Failed to accept delivery');
      }
    } finally {
      setAcceptingRequest(null);
    }
  };

  const handleRejectDelivery = async (requestId: string) => {
    if (!user) return;

    setRejectingRequest(requestId);
    try {
      await rejectDeliveryRequest(requestId, user.id);

      // Remove from local state
      setDeliveryRequests(prev => prev.filter(req => req.id !== requestId));

      toast.info('Delivery request rejected');
    } catch (error: any) {
      console.error('Error rejecting delivery:', error);
      // If already responded, just remove from UI
      setDeliveryRequests(prev => prev.filter(req => req.id !== requestId));
    } finally {
      setRejectingRequest(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">QuickHop Rider</h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
                <Badge variant={isAvailable ? "default" : "secondary"} className="text-xs">
                  {isAvailable ? "🟢 Available" : "🔴 Busy"}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogoutAsync}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Delivery Request Notifications - Only shown when rider is available and has no active delivery */}
        {isAvailable && !activeDelivery && deliveryRequests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              Available Deliveries ({deliveryRequests.length})
            </h2>
            <div className="grid gap-3">
              {deliveryRequests.map((request) => {
                const delivery = request.deliveries;
                if (!delivery) return null;

                return (
                  <Card key={request.id} className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary text-primary-foreground">
                              NEW
                            </Badge>
                            <p className="font-semibold">{delivery.business_name}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Pickup</p>
                              <p className="text-sm text-muted-foreground">{delivery.pickup_address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              {/* We'll need to fetch drop-offs count separately or include it in the query */}
                              Multiple stops
                            </span>
                            {delivery.scheduled_for && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(delivery.scheduled_for).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptDelivery(request.id)}
                            disabled={!!acceptingRequest || !!rejectingRequest}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {acceptingRequest === request.id ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Accepting...</>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4 mr-2" /> Accept</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectDelivery(request.id)}
                            disabled={!!acceptingRequest || !!rejectingRequest}
                          >
                            {rejectingRequest === request.id ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting...</>
                            ) : (
                              'Reject'
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !activeDelivery ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Navigation className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Delivery</h3>
              <p className="text-muted-foreground">You don't have any assigned deliveries at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later or contact admin for assignments.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Active Delivery</CardTitle>
                  <CardDescription>
                    Delivery #{activeDelivery.id.substring(0, 8)} from {activeDelivery.business_name}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {activeDelivery.drop_offs.filter(d => d.status === 'delivered').length} of {activeDelivery.drop_offs.length} delivered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pickup Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  Pickup Location
                </div>
                <p className="text-sm text-muted-foreground">{activeDelivery.pickup_address}</p>
                {activeDelivery.scheduled_for && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Scheduled: {new Date(activeDelivery.scheduled_for).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Route Map */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Complete Route</h3>
                <div className="h-[400px]">
                  <RouteViewer
                    startLocation={activeDelivery.pickup_address}
                    endLocation={activeDelivery.drop_offs[activeDelivery.drop_offs.length - 1].address}
                    waypoints={activeDelivery.drop_offs.slice(0, -1).map(s => s.address)}
                    showMap={true}
                  />
                </div>
              </div>

              {/* Stops List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Drop-off Locations
                </h3>
                <div className="space-y-3">
                  {activeDelivery.drop_offs
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((stop, index) => {
                      const isDelivered = stop.status === 'delivered';
                      const isCurrent = !isDelivered && activeDelivery.drop_offs.filter((d, i) => i < index && d.status !== 'delivered').length === 0;

                      return (
                        <Card
                          key={stop.id}
                          className={`
                            ${isCurrent ? 'border-primary bg-primary/5' : ''}
                            ${isDelivered ? 'opacity-60' : ''}
                          `}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  {isDelivered ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <Circle className={`w-5 h-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                                  )}
                                  <div>
                                    <p className="font-semibold">
                                      Stop {stop.sequence}: {stop.customer_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{stop.customer_phone}</p>
                                  </div>
                                </div>
                                <div className="ml-7">
                                  <p className="text-sm">{stop.address}</p>
                                  {stop.delivered_at && (
                                    <p className="text-xs text-green-600 mt-1">
                                      ✓ Delivered at {new Date(stop.delivered_at).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {!isDelivered && isCurrent && (
                                <Button
                                  onClick={() => handleMarkDelivered(stop.id, index)}
                                  size="sm"
                                  disabled={!!markingDelivered}
                                >
                                  {markingDelivered === stop.id ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Marking...</>
                                  ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Mark Delivered</>
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
