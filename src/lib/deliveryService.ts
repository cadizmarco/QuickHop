import { supabase } from './supabase';
import type { Database } from './supabase';
import { sendTrackingEmail } from './emailService';

type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];
type DeliveryInsert = Database['public']['Tables']['deliveries']['Insert'];
type DropOffInsert = Database['public']['Tables']['drop_offs']['Insert'];
type DropOffRow = Database['public']['Tables']['drop_offs']['Row'];

export interface CreateDeliveryData {
    pickupAddress: string;
    dropOffs: {
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        address: string;
    }[];
    scheduledFor?: string;
    notes?: string;
}

export interface DeliveryWithDropOffs extends DeliveryRow {
    drop_offs: DropOffRow[];
}

/**
 * Create a new delivery with drop-offs
 */
export async function createDelivery(
    businessId: string,
    businessName: string,
    data: CreateDeliveryData
) {
    try {
        // 1. Insert delivery record
        const deliveryData: DeliveryInsert = {
            business_id: businessId,
            business_name: businessName,
            pickup_address: data.pickupAddress,
            scheduled_for: data.scheduledFor || null,
            notes: data.notes || null,
            status: 'pending',
        };

        const { data: delivery, error: deliveryError } = await supabase
            .from('deliveries')
            .insert(deliveryData)
            .select()
            .single();

        if (deliveryError) throw deliveryError;
        if (!delivery) throw new Error('Failed to create delivery');

        // 2. Insert drop-offs
        const dropOffsData: DropOffInsert[] = data.dropOffs
            .filter(d => d.address && d.customerName)
            .map((dropOff, index) => ({
                delivery_id: delivery.id,
                customer_name: dropOff.customerName,
                customer_phone: dropOff.customerPhone,
                customer_email: dropOff.customerEmail || null,
                address: dropOff.address,
                sequence: index + 1,
                status: 'pending',
            }));

        const { data: dropOffs, error: dropOffsError } = await supabase
            .from('drop_offs')
            .insert(dropOffsData)
            .select();

        if (dropOffsError) throw dropOffsError;

        // 3. Send tracking emails asynchronously (don't block response)
        if (dropOffs) {
            dropOffs.forEach(async (dropOff) => {
                if (dropOff.customer_email && dropOff.tracking_number) {
                    try {
                        await sendTrackingEmail(
                            dropOff.customer_email,
                            dropOff.tracking_number,
                            dropOff.customer_name
                        );
                    } catch (emailError) {
                        console.error('Failed to send tracking email:', emailError);
                    }
                }
            });
        }

        return {
            ...delivery,
            drop_offs: dropOffs || [],
        };
    } catch (error) {
        console.error('Error creating delivery:', error);
        throw error;
    }
}

/**
 * Create delivery request for rider queue system
 */
export async function createDeliveryRequest(deliveryId: string, expiresInMinutes: number = 30) {
    try {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

        const { data, error } = await supabase
            .from('delivery_requests')
            .insert({
                delivery_id: deliveryId,
                status: 'pending_acceptance',
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating delivery request:', error);
        throw error;
    }
}

/**
 * Get deliveries for a business user
 */
export async function getDeliveriesByBusiness(businessId: string) {
    try {
        const { data, error } = await supabase
            .from('deliveries')
            .select(`
        *,
        drop_offs (*)
      `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as DeliveryWithDropOffs[];
    } catch (error) {
        console.error('Error fetching business deliveries:', error);
        throw error;
    }
}

/**
 * Get active delivery for a rider
 */
export async function getActiveDeliveryByRider(riderId: string) {
    try {
        const { data, error } = await supabase
            .from('deliveries')
            .select(`
        *,
        drop_offs (*)
      `)
            .eq('rider_id', riderId)
            .in('status', ['assigned', 'picked_up', 'in_transit'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            throw error;
        }

        return data as DeliveryWithDropOffs | null;
    } catch (error) {
        console.error('Error fetching rider delivery:', error);
        throw error;
    }
}

/**
 * Track delivery by customer phone number
 */
export async function trackDeliveryByPhone(phone: string) {
    try {
        // Find drop-off with this phone number
        const { data: dropOff, error: dropOffError } = await supabase
            .from('drop_offs')
            .select(`
        *,
        deliveries (*)
      `)
            .eq('customer_phone', phone)
            .in('status', ['pending', 'picked_up', 'in_transit'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (dropOffError) {
            if (dropOffError.code === 'PGRST116') {
                return null;
            }
            throw dropOffError;
        }

        return {
            dropOff,
            delivery: (dropOff as any).deliveries,
        };
    } catch (error) {
        console.error('Error tracking delivery:', error);
        throw error;
    }
}

/**
 * Track delivery by tracking number
 */
export async function trackDeliveryByTrackingNumber(trackingNumber: string) {
    try {
        // 1. Find drop-off with this tracking number
        const { data: dropOff, error: dropOffError } = await supabase
            .from('drop_offs')
            .select(`
                *,
                deliveries (
                    *,
                    business:profiles!deliveries_business_id_fkey (
                        name,
                        email,
                        phone
                    ),
                    rider:profiles!deliveries_rider_id_fkey (
                        name,
                        phone
                    )
                )
            `)
            .eq('tracking_number', trackingNumber)
            .single();

        if (dropOffError) {
            if (dropOffError.code === 'PGRST116') {
                return null;
            }
            throw dropOffError;
        }

        return {
            dropOff,
            delivery: (dropOff as any).deliveries,
            business: (dropOff as any).deliveries.business,
            rider: (dropOff as any).deliveries.rider,
        };
    } catch (error) {
        console.error('Error tracking delivery:', error);
        throw error;
    }
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
    deliveryId: string,
    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
) {
    try {
        const updateData: any = { status };

        if (status === 'delivered') {
            updateData.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('deliveries')
            .update(updateData)
            .eq('id', deliveryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating delivery status:', error);
        throw error;
    }
}

/**
 * Assign delivery to rider (Admin function)
 */
export async function assignDeliveryToRider(
    deliveryId: string,
    riderId: string,
    riderName: string
) {
    try {
        const { data, error } = await supabase
            .from('deliveries')
            .update({
                rider_id: riderId,
                rider_name: riderName,
                status: 'assigned',
            })
            .eq('id', deliveryId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error assigning delivery to rider:', error);
        throw error;
    }
}

/**
 * Mark drop-off as delivered
 */
export async function markDropOffDelivered(dropOffId: string) {
    try {
        const { data, error } = await supabase
            .from('drop_offs')
            .update({
                status: 'delivered',
                delivered_at: new Date().toISOString(),
            })
            .eq('id', dropOffId)
            .select()
            .single();

        if (error) throw error;

        // Check if all drop-offs are delivered, then update delivery status
        const { data: dropOff } = await supabase
            .from('drop_offs')
            .select('delivery_id')
            .eq('id', dropOffId)
            .single();

        if (dropOff) {
            const { data: allDropOffs } = await supabase
                .from('drop_offs')
                .select('status')
                .eq('delivery_id', dropOff.delivery_id);

            const allDelivered = allDropOffs?.every(d => d.status === 'delivered');

            if (allDelivered) {
                await updateDeliveryStatus(dropOff.delivery_id, 'delivered');
            } else {
                // Update to in_transit if at least one is delivered
                await updateDeliveryStatus(dropOff.delivery_id, 'in_transit');
            }
        }

        return data;
    } catch (error) {
        console.error('Error marking drop-off as delivered:', error);
        throw error;
    }
}

/**
 * Subscribe to delivery changes (real-time)
 */
export function subscribeToDeliveries(
    businessId: string,
    callback: (payload: any) => void
) {
    const channel = supabase
        .channel('deliveries-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'deliveries',
                filter: `business_id=eq.${businessId}`,
            },
            callback
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Subscribe to drop-off changes for a specific delivery (real-time)
 */
export function subscribeToDropOffs(
    deliveryId: string,
    callback: (payload: any) => void
) {
    const channel = supabase
        .channel('drop-offs-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'drop_offs',
                filter: `delivery_id=eq.${deliveryId}`,
            },
            callback
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Get all deliveries (Admin function)
 */
export async function getAllDeliveries() {
    try {
        const { data, error } = await supabase
            .from('deliveries')
            .select(`
        *,
        drop_offs (*)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as DeliveryWithDropOffs[];
    } catch (error) {
        console.error('Error fetching all deliveries:', error);
        throw error;
    }
}

/**
 * Accept a delivery request (first-come-first-served)
 */
export async function acceptDeliveryRequest(deliveryRequestId: string, riderId: string, riderName: string) {
    try {
        // 1. Record the rider's response with timestamp
        const responseTimestamp = new Date().toISOString();

        const { error: responseError } = await supabase
            .from('rider_delivery_responses')
            .insert({
                delivery_request_id: deliveryRequestId,
                rider_id: riderId,
                action: 'accepted',
                response_timestamp: responseTimestamp,
            });

        if (responseError) {
            // Check if rider already responded
            if (responseError.code === '23505') { // Unique constraint violation
                throw new Error('You have already responded to this delivery request');
            }
            throw responseError;
        }

        // 2. Get the delivery request to check if it's still pending
        const { data: deliveryRequest, error: fetchError } = await supabase
            .from('delivery_requests')
            .select('*, deliveries(*)')
            .eq('id', deliveryRequestId)
            .single();

        if (fetchError) throw fetchError;
        if (!deliveryRequest) throw new Error('Delivery request not found');

        // Check if already accepted by someone
        if (deliveryRequest.status === 'accepted') {
            throw new Error('This delivery has already been claimed by another rider');
        }

        // 3. Call database function to get earliest acceptor
        const { data: earliestAcceptor, error: funcError } = await supabase
            .rpc('get_earliest_acceptor', { p_delivery_request_id: deliveryRequestId });

        if (funcError) throw funcError;

        // 4. Check if this rider is the earliest
        if (earliestAcceptor !== riderId) {
            // Another rider was faster
            throw new Error('Another rider accepted this delivery first');
        }

        // 5. This rider is the fastest! Update delivery request and assign delivery
        const { error: updateRequestError } = await supabase
            .from('delivery_requests')
            .update({
                status: 'accepted',
                accepted_at: responseTimestamp,
                accepted_by_rider_id: riderId,
            })
            .eq('id', deliveryRequestId)
            .eq('status', 'pending_acceptance'); // Only update if still pending

        if (updateRequestError) throw updateRequestError;

        // 6. Assign delivery to rider and automatically set to picked_up (accepted)
        const { error: assignError } = await supabase
            .from('deliveries')
            .update({
                rider_id: riderId,
                rider_name: riderName,
                status: 'picked_up', // Automatically set to picked_up when rider accepts
            })
            .eq('id', deliveryRequest.delivery_id);

        if (assignError) throw assignError;

        return {
            success: true,
            deliveryId: deliveryRequest.delivery_id,
        };
    } catch (error: any) {
        console.error('Error accepting delivery request:', error);
        throw error;
    }
}

/**
 * Reject a delivery request
 */
export async function rejectDeliveryRequest(deliveryRequestId: string, riderId: string) {
    try {
        const { error } = await supabase
            .from('rider_delivery_responses')
            .insert({
                delivery_request_id: deliveryRequestId,
                rider_id: riderId,
                action: 'rejected',
            });

        if (error) {
            if (error.code === '23505') { // Already responded
                return { success: true }; // Already rejected, that's fine
            }
            throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('Error rejecting delivery request:', error);
        throw error;
    }
}

/**
 * Subscribe to delivery requests for riders (real-time)
 */
export function subscribeToDeliveryRequests(callback: (payload: any) => void) {
    const channel = supabase
        .channel('delivery-requests-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'delivery_requests',
                filter: 'status=eq.pending_acceptance',
            },
            callback
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Get pending delivery requests
 */
export async function getPendingDeliveryRequests() {
    try {
        const { data, error } = await supabase
            .from('delivery_requests')
            .select(`
                *,
                deliveries (
                    id,
                    business_name,
                    pickup_address,
                    scheduled_for,
                    notes
                )
            `)
            .eq('status', 'pending_acceptance')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching pending delivery requests:', error);
        throw error;
    }
}

/**
 * Get delivery request by ID with drop-offs count
 */
export async function getDeliveryRequestDetails(deliveryRequestId: string) {
    try {
        const { data, error } = await supabase
            .from('delivery_requests')
            .select(`
                *,
                deliveries (
                    *,
                    drop_offs (count)
                )
            `)
            .eq('id', deliveryRequestId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching delivery request details:', error);
        throw error;
    }
}

/**
 * Update rider availability status
 */
export async function updateRiderAvailability(riderId: string, isAvailable: boolean) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_available: isAvailable })
            .eq('id', riderId)
            .eq('role', 'rider');

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating rider availability:', error);
        throw error;
    }
}

/**
 * Get rider's availability status
 */
export async function getRiderAvailability(riderId: string) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_available')
            .eq('id', riderId)
            .eq('role', 'rider')
            .single();

        if (error) throw error;
        return data?.is_available ?? true;
    } catch (error) {
        console.error('Error getting rider availability:', error);
        throw error;
    }
}
