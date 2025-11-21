# API Integration Guide - QuickHop Delivery System

## Overview
This guide explains how to integrate the QuickHop frontend with your backend API to handle delivery creation, rider assignment, and customer notifications.

---

## 🔄 Complete Delivery Flow

### Step 1: Business Creates Delivery

**Frontend:** `src/pages/BusinessDashboard.tsx` → `handleCreateDelivery()`

**API Endpoint:** `POST /api/deliveries`

**Request Body:**
```json
{
  "businessId": "business-123",
  "businessName": "ABC Store",
  "pickupAddress": "123 Business St, Manila",
  "dropOffs": [
    {
      "customerName": "John Doe",
      "customerPhone": "+63 912 345 6789",
      "address": "456 Home Ave, Quezon City"
    },
    {
      "customerName": "Jane Smith",
      "customerPhone": "+63 912 345 6790",
      "address": "789 Apartment Rd, Makati"
    }
  ],
  "scheduledDate": "2024-01-15T14:30:00",
  "notes": "Fragile items",
  "status": "pending"
}
```

**Response:**
```json
{
  "success": true,
  "delivery": {
    "id": "DEL-001",
    "businessId": "business-123",
    "businessName": "ABC Store",
    "pickupAddress": "123 Business St, Manila",
    "dropOffs": [
      {
        "id": "drop-001",
        "customerName": "John Doe",
        "customerPhone": "+63 912 345 6789",
        "address": "456 Home Ave, Quezon City",
        "status": "pending"
      },
      {
        "id": "drop-002",
        "customerName": "Jane Smith",
        "customerPhone": "+63 912 345 6790",
        "address": "789 Apartment Rd, Makati",
        "status": "pending"
      }
    ],
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z",
    "scheduledFor": "2024-01-15T14:30:00Z"
  }
}
```

---

### Step 2: Backend Assigns to Available Rider

**Backend Logic:**

```javascript
// After delivery is created
async function assignDeliveryToRider(deliveryId) {
  // 1. Find available riders
  const availableRiders = await Rider.find({ 
    status: 'available',
    isOnline: true 
  });
  
  if (availableRiders.length === 0) {
    // No riders available - delivery stays in 'pending' status
    return null;
  }
  
  // 2. Select best rider (closest, highest rating, etc.)
  const selectedRider = findBestRider(availableRiders, delivery.pickupAddress);
  
  // 3. Assign delivery to rider
  await Delivery.updateOne(
    { id: deliveryId },
    { 
      riderId: selectedRider.id,
      riderName: selectedRider.name,
      riderPhone: selectedRider.phone,
      status: 'assigned'
    }
  );
  
  // 4. Update rider status
  await Rider.updateOne(
    { id: selectedRider.id },
    { status: 'busy', currentDeliveryId: deliveryId }
  );
  
  // 5. Send notification to rider
  await sendNotificationToRider(selectedRider.id, deliveryId);
  
  return selectedRider;
}
```

**Notification to Rider:**

**API Endpoint:** `POST /api/notifications` (or WebSocket/Push Notification)

```json
{
  "recipientId": "rider-456",
  "recipientType": "rider",
  "type": "delivery_assigned",
  "title": "New Delivery Assigned",
  "message": "You have a new delivery from ABC Store with 2 drop-offs",
  "data": {
    "deliveryId": "DEL-001",
    "pickupAddress": "123 Business St, Manila",
    "dropOffCount": 2
  }
}
```

---

### Step 3: Backend Notifies All Customers

**Backend Logic:**

```javascript
async function notifyCustomers(delivery) {
  // For each drop-off, notify the customer
  for (const dropOff of delivery.dropOffs) {
    await createCustomerNotification({
      customerName: dropOff.customerName,
      customerPhone: dropOff.customerPhone,
      deliveryId: delivery.id,
      businessName: delivery.businessName,
      pickupAddress: delivery.pickupAddress,
      deliveryAddress: dropOff.address,
      estimatedArrival: calculateETA(delivery)
    });
    
    // Send SMS notification (optional)
    await sendSMS({
      to: dropOff.customerPhone,
      message: `Your delivery from ${delivery.businessName} is on the way! Track it here: ${APP_URL}/track/${delivery.id}`
    });
    
    // Send email notification (optional)
    await sendEmail({
      to: dropOff.customerEmail,
      subject: 'Your Delivery is On The Way',
      template: 'delivery_assigned',
      data: { delivery, dropOff }
    });
  }
}
```

**Customer Notification Data:**

```json
{
  "recipientPhone": "+63 912 345 6789",
  "recipientType": "customer",
  "type": "delivery_on_the_way",
  "title": "Your Delivery is On The Way",
  "message": "Your package from ABC Store will arrive soon",
  "data": {
    "deliveryId": "DEL-001",
    "businessName": "ABC Store",
    "pickupAddress": "123 Business St, Manila",
    "deliveryAddress": "456 Home Ave, Quezon City",
    "estimatedArrival": "2024-01-15T15:30:00Z",
    "trackingUrl": "https://quickhop.com/track/DEL-001"
  }
}
```

---

## 📱 Frontend Data Fetching

### Rider Dashboard

**Frontend:** `src/pages/RiderDashboard.tsx`

**API Endpoint:** `GET /api/riders/{riderId}/deliveries/active`

**Response:**
```json
{
  "activeDelivery": {
    "id": "DEL-001",
    "businessId": "business-123",
    "businessName": "ABC Store",
    "pickupAddress": "123 Business St, Manila",
    "dropOffs": [
      {
        "id": "drop-001",
        "customerName": "John Doe",
        "customerPhone": "+63 912 345 6789",
        "address": "456 Home Ave, Quezon City",
        "status": "pending"
      },
      {
        "id": "drop-002",
        "customerName": "Jane Smith",
        "customerPhone": "+63 912 345 6790",
        "address": "789 Apartment Rd, Makati",
        "status": "pending"
      }
    ],
    "status": "assigned",
    "assignedAt": "2024-01-15T10:05:00Z"
  }
}
```

**Implementation:**
```typescript
// In RiderDashboard.tsx
useEffect(() => {
  async function fetchActiveDelivery() {
    const response = await fetch(`/api/riders/${user.id}/deliveries/active`);
    const data = await response.json();
    setActiveDelivery(data.activeDelivery);
  }
  
  fetchActiveDelivery();
  
  // Poll for updates every 30 seconds
  const interval = setInterval(fetchActiveDelivery, 30000);
  return () => clearInterval(interval);
}, [user.id]);
```

---

### Customer Dashboard

**Frontend:** `src/pages/CustomerDashboard.tsx`

**API Endpoint:** `GET /api/deliveries/track?phone={customerPhone}`

**Query Parameters:**
- `phone`: Customer phone number (for tracking without login)
- OR use authenticated user ID if customer has an account

**Response:**
```json
{
  "delivery": {
    "id": "DEL-001",
    "businessName": "ABC Store",
    "pickupAddress": "123 Business St, Manila",
    "deliveryAddress": "456 Home Ave, Quezon City",
    "customerName": "John Doe",
    "status": "in_transit",
    "riderId": "rider-456",
    "riderName": "Juan Dela Cruz",
    "riderPhone": "+63 912 111 2222",
    "estimatedArrival": "2024-01-15T15:30:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "assignedAt": "2024-01-15T10:05:00Z",
    "pickedUpAt": "2024-01-15T10:30:00Z"
  }
}
```

**Implementation:**
```typescript
// In CustomerDashboard.tsx
useEffect(() => {
  async function fetchDelivery() {
    // Option 1: Track by phone (no login required)
    const response = await fetch(`/api/deliveries/track?phone=${customerPhone}`);
    
    // Option 2: Track by user ID (logged in customer)
    // const response = await fetch(`/api/customers/${user.id}/deliveries/active`);
    
    const data = await response.json();
    setDelivery(data.delivery);
  }
  
  fetchDelivery();
  
  // Poll for updates every 15 seconds for real-time tracking
  const interval = setInterval(fetchDelivery, 15000);
  return () => clearInterval(interval);
}, [customerPhone]);
```

---

## 🔔 Notification System

### Real-Time Updates (WebSocket)

**Backend Setup:**
```javascript
// Socket.IO or similar
io.on('connection', (socket) => {
  // Rider joins their room
  socket.on('rider:join', (riderId) => {
    socket.join(`rider:${riderId}`);
  });
  
  // Customer joins delivery tracking room
  socket.on('customer:track', (deliveryId) => {
    socket.join(`delivery:${deliveryId}`);
  });
});

// When delivery is assigned
io.to(`rider:${riderId}`).emit('delivery:assigned', deliveryData);

// When delivery status updates
io.to(`delivery:${deliveryId}`).emit('delivery:updated', deliveryData);
```

**Frontend Setup:**
```typescript
// In RiderDashboard.tsx
useEffect(() => {
  const socket = io('wss://your-backend.com');
  
  socket.emit('rider:join', user.id);
  
  socket.on('delivery:assigned', (delivery) => {
    setActiveDelivery(delivery);
    toast.info('New delivery assigned!');
  });
  
  return () => socket.disconnect();
}, []);
```

---

## 📊 Database Schema (Reference)

### Deliveries Collection
```javascript
{
  id: "DEL-001",
  businessId: "business-123",
  businessName: "ABC Store",
  pickupAddress: "123 Business St, Manila",
  pickupLocation: { lat: 14.5995, lng: 120.9842 },
  
  dropOffs: [
    {
      id: "drop-001",
      customerName: "John Doe",
      customerPhone: "+63 912 345 6789",
      customerEmail: "john@example.com",
      address: "456 Home Ave, Quezon City",
      location: { lat: 14.6760, lng: 121.0437 },
      status: "pending", // pending, picked_up, in_transit, delivered
      deliveredAt: null,
      sequence: 1
    }
  ],
  
  riderId: "rider-456",
  riderName: "Juan Dela Cruz",
  riderPhone: "+63 912 111 2222",
  
  status: "assigned", // pending, assigned, picked_up, in_transit, delivered, cancelled
  
  createdAt: "2024-01-15T10:00:00Z",
  scheduledFor: "2024-01-15T14:30:00Z",
  assignedAt: "2024-01-15T10:05:00Z",
  pickedUpAt: null,
  completedAt: null,
  
  notes: "Fragile items",
  
  // Route information
  routeData: {
    totalDistance: "15.3 km",
    estimatedDuration: "25 minutes",
    waypoints: ["456 Home Ave", "789 Apartment Rd"]
  }
}
```

---

## 🚀 API Endpoints Summary

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/deliveries` | POST | Create new delivery | Business |
| `/api/deliveries/:id` | GET | Get delivery details | All |
| `/api/deliveries/:id` | PATCH | Update delivery status | Rider |
| `/api/riders/:id/deliveries/active` | GET | Get rider's active delivery | Rider |
| `/api/customers/:id/deliveries` | GET | Get customer deliveries | Customer |
| `/api/deliveries/track?phone=...` | GET | Track by phone (no login) | Customer |
| `/api/riders/available` | GET | Get available riders | Backend |
| `/api/deliveries/:id/assign` | POST | Assign to rider | Backend |
| `/api/notifications` | POST | Send notification | Backend |

---

## 🔐 Authentication Flow

### Business Dashboard
```typescript
headers: {
  'Authorization': `Bearer ${businessToken}`,
  'Content-Type': 'application/json'
}
```

### Rider Dashboard
```typescript
headers: {
  'Authorization': `Bearer ${riderToken}`,
  'Content-Type': 'application/json'
}
```

### Customer Dashboard (Option 1: Phone-based)
```typescript
// No authentication required
// Track by phone number
GET /api/deliveries/track?phone=+639123456789
```

### Customer Dashboard (Option 2: Account-based)
```typescript
headers: {
  'Authorization': `Bearer ${customerToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📝 Implementation Checklist

### Phase 1: Basic Flow
- [ ] Create POST `/api/deliveries` endpoint
- [ ] Implement delivery-to-rider assignment logic
- [ ] Create GET `/api/riders/:id/deliveries/active` endpoint
- [ ] Create GET `/api/deliveries/track` endpoint for customers
- [ ] Integrate frontend forms with API
- [ ] Handle success/error responses

### Phase 2: Notifications
- [ ] Set up notification service (SMS/Email)
- [ ] Send notifications when delivery is assigned
- [ ] Send notifications to all customers
- [ ] Implement push notifications (optional)

### Phase 3: Real-Time Updates
- [ ] Set up WebSocket server
- [ ] Implement real-time delivery status updates
- [ ] Add live rider location tracking
- [ ] Implement real-time ETA updates

### Phase 4: Advanced Features
- [ ] Rider location tracking with GPS
- [ ] Automatic rider selection algorithm
- [ ] Route optimization service
- [ ] Delivery history and analytics
- [ ] Payment integration

---

## 🧪 Testing the Flow

### 1. Test Delivery Creation
```bash
curl -X POST http://localhost:3000/api/deliveries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -d '{
    "businessId": "business-123",
    "pickupAddress": "123 Business St, Manila",
    "dropOffs": [
      {
        "customerName": "John Doe",
        "customerPhone": "+63 912 345 6789",
        "address": "456 Home Ave, Quezon City"
      }
    ]
  }'
```

### 2. Test Rider Fetch
```bash
curl http://localhost:3000/api/riders/rider-456/deliveries/active \
  -H "Authorization: Bearer RIDER_TOKEN"
```

### 3. Test Customer Tracking
```bash
curl "http://localhost:3000/api/deliveries/track?phone=%2B639123456789"
```

---

## 💡 Tips for Implementation

1. **Idempotency**: Make delivery creation idempotent to prevent duplicates
2. **Retry Logic**: Implement retry logic for failed notifications
3. **Rate Limiting**: Protect endpoints with rate limiting
4. **Validation**: Validate addresses using Google Maps Geocoding API
5. **Logging**: Log all state changes for debugging and analytics
6. **Error Handling**: Provide clear error messages to users
7. **Webhooks**: Consider webhooks for external integrations
8. **Caching**: Cache delivery data to reduce database load

---

## 🔄 State Transitions

```
Delivery States:
pending → assigned → picked_up → in_transit → delivered

Drop-off States (individual):
pending → in_transit → delivered

Rider States:
available → busy → available
```

---

## 📞 Support

For questions about this integration:
1. Review the frontend code in `src/pages/`
2. Check `src/types/delivery.ts` for TypeScript interfaces
3. See `DELIVERY_FLOW.md` for routing details
4. Refer to Google Maps API documentation for location services

