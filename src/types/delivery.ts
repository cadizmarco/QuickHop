export type UserRole = 'admin' | 'customer' | 'business' | 'rider';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface DropOff {
  id: string;
  customerName: string;
  customerPhone: string;
  location: Location;
  status: DeliveryStatus;
  deliveredAt?: Date;
}

export interface Delivery {
  id: string;
  businessId: string;
  businessName: string;
  riderId?: string;
  riderName?: string;
  pickupLocation: Location;
  dropOffs: DropOff[];
  status: DeliveryStatus;
  createdAt: Date;
  scheduledFor?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}
