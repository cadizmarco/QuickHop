# QuickHop Delivery Flow

## Overview
This document explains how the delivery booking and route sharing works across Business, Rider, and Customer accounts.

## 📋 Complete Flow

### 1. Business Creates Delivery (Business Dashboard)
**Location:** `src/pages/BusinessDashboard.tsx`

The business account initiates the delivery process:

1. **Opens "New Delivery" Dialog**
   - Enters pickup address (business location)
   - Adds multiple drop-off locations with customer details:
     - Customer name
     - Customer phone
     - Delivery address
   - Can add/remove drop-offs dynamically

2. **Route Preview**
   - Clicks "Preview Route on Map" button
   - Google Maps displays the route from pickup to first drop-off
   - Shows preview of what the rider will see

3. **Creates Booking**
   - Optionally adds scheduled date/time and notes
   - Clicks "Create Booking"
   - Route information is stored and shared

**Data Created:**
```typescript
{
  id: 'DEL-XXX',
  businessId: 'business-user-id',
  businessName: 'ABC Store',
  pickupAddress: '123 Business St, Manila',
  dropOffs: [
    {
      customerName: 'John Doe',
      customerPhone: '+63 912 345 6789',
      address: '456 Home Ave, Quezon City'
    },
    // ... more drop-offs
  ],
  status: 'pending',
  scheduledDate: '2024-01-15T14:30:00',
  notes: 'Fragile items'
}
```

### 2. Rider Receives Route (Rider Dashboard)
**Location:** `src/pages/RiderDashboard.tsx`

Once a delivery is assigned to a rider:

1. **Views Active Delivery**
   - Sees pickup address (from business)
   - Sees all drop-off locations
   - Each drop-off shows customer name and address

2. **Route Navigation**
   - Google Maps RouteViewer displays current route:
     - Initially: Pickup → First Drop-off
     - After completing drops: Last completed → Next pending
   - Route updates automatically as deliveries are marked complete

3. **Marks Deliveries Complete**
   - "Mark Delivered" button for each drop-off
   - Route updates to show next destination

**Route Logic:**
- All pending: Shows pickup → first drop-off
- Partially complete: Shows last delivered → next pending
- All complete: Shows final route

### 3. Customer Tracks Delivery (Customer Dashboard)
**Location:** `src/pages/CustomerDashboard.tsx`

Customers can track their specific delivery:

1. **Views Delivery Info**
   - Sees their delivery details
   - Shows business name (who sent it)
   - Pickup address (business location)
   - Their delivery address (from business booking)

2. **Live Route Tracking**
   - Google Maps RouteViewer shows:
     - From: Business pickup location
     - To: Customer's delivery address
   - Shows estimated arrival time
   - Displays rider name

**Data Received:**
```typescript
{
  id: 'DEL-XXX',
  businessName: 'ABC Store',
  pickupAddress: '123 Business St, Manila', // From business
  deliveryAddress: '456 Home Ave, Quezon City', // From business booking
  riderName: 'Juan Dela Cruz',
  estimatedArrival: '2:30 PM',
  status: 'in_transit'
}
```

## 🗺️ Route Sharing Architecture

### Data Flow

```
Business Account
    ↓
Creates Delivery with:
- Pickup address
- Multiple drop-off addresses (as waypoints)
- Google Maps calculates optimized route
- Shows fastest path through all stops
    ↓
Backend/Database
    ↓
    ├─→ Rider Account
    │   (Receives full optimized route: pickup → drop1 → drop2 → ... → dropN)
    │   Updates dynamically as deliveries are completed
    │
    └─→ Customer Accounts
        (Each receives their specific route: pickup → their address)
```

### Route Optimization

The system uses Google Maps Directions API with **waypoints** to:
1. Calculate the fastest route through all drop-off locations
2. Consider real-time traffic conditions
3. Optimize the sequence for quickest total delivery time
4. Display all stops on a single map with the complete route

### Route Component (`src/components/RouteViewer.tsx`)

**Purpose:** Reusable component that displays Google Maps directions with multiple waypoints

**Props:**
- `startLocation`: Starting address (pickup location)
- `endLocation`: Final destination address
- `waypoints`: Array of intermediate stop addresses (optional)
- `showMap`: Boolean to show map or placeholder

**Features:**
- Displays complete route with all stops
- Shows each waypoint in the route header
- Automatically optimizes for fastest route
- Highlights the best path on Google Maps

**Usage Across Dashboards:**

1. **Business (Create/View Deliveries):**
   ```tsx
   <RouteViewer
     startLocation={pickupAddress}
     endLocation={dropOffs[last].address}
     waypoints={dropOffs.slice(0, -1).map(d => d.address)}
     showMap={true}
   />
   ```
   Shows complete route: Pickup → Drop-off 1 → Drop-off 2 → ... → Last Drop-off

2. **Rider (Active Delivery):**
   ```tsx
   <RouteViewer
     startLocation={currentRoute.from}
     endLocation={currentRoute.to}
     waypoints={currentRoute.waypoints}  // Remaining stops
     showMap={true}
   />
   ```
   Shows remaining route that updates as deliveries are marked complete

3. **Customer (Track Delivery):**
   ```tsx
   <RouteViewer
     startLocation={delivery.pickupAddress}
     endLocation={delivery.deliveryAddress}
     showMap={true}
   />
   ```
   Shows their specific route from business to their address

## 🔄 Real-Time Updates (Future Implementation)

When connected to a backend:

1. **Business creates delivery** → POST to `/api/deliveries`
2. **System assigns rider** → Updates delivery with riderId
3. **Rider updates status** → PATCH to `/api/deliveries/:id/status`
4. **Customers get notified** → WebSocket/polling updates
5. **All parties see live route updates** → Google Maps API + real-time location

## 🎯 Key Features

### Business Dashboard
- ✅ Multi-drop-off booking form
- ✅ Dynamic drop-off management (add/remove)
- ✅ **Complete route preview with all waypoints**
- ✅ **Google Maps shows optimized fastest route**
- ✅ View all created deliveries with full route maps
- ✅ See all stops displayed on a single map

### Rider Dashboard
- ✅ See assigned deliveries with all drop-offs
- ✅ **Complete route with remaining waypoints**
- ✅ **Dynamic route updates as deliveries are completed**
- ✅ Mark deliveries as complete
- ✅ **Optimized route automatically recalculates**
- ✅ Visual display of all remaining stops

### Customer Dashboard
- ✅ Track delivery in real-time
- ✅ See route from business to their location
- ✅ View estimated arrival
- ✅ See rider information

## 📱 Google Maps Integration

**API Key:** `AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`

**Embed URL Format (with Waypoints):**
```
https://www.google.com/maps/embed/v1/directions
  ?key=API_KEY
  &origin=ENCODED_START_ADDRESS
  &destination=ENCODED_END_ADDRESS
  &waypoints=ENCODED_STOP1|ENCODED_STOP2|ENCODED_STOP3
  &mode=driving
```

**Example with Multiple Stops:**
```
Pickup: 123 Business St, Manila
Drop-off 1: 456 Home Ave, Quezon City
Drop-off 2: 789 Apartment Rd, Makati
Drop-off 3: 321 Condo Blvd, Taguig

URL Parameters:
- origin: 123 Business St, Manila
- waypoints: 456 Home Ave, Quezon City|789 Apartment Rd, Makati
- destination: 321 Condo Blvd, Taguig
```

**Features:**
- ✅ Turn-by-turn directions through all stops
- ✅ Real-time traffic conditions
- ✅ **Automatic route optimization (fastest path)**
- ✅ **Multiple waypoints support (up to 25 stops)**
- ✅ Interactive map controls
- ✅ Visual markers for all stops
- ✅ Highlighted fastest route
- ✅ Distance and time estimates for each leg

## 🚀 Current Implementation ✅

1. ✅ **Route Optimization:** Google Maps automatically calculates optimal order for multiple drop-offs
2. ✅ **Waypoints Support:** All drop-offs shown on a single map with markers
3. ✅ **Fastest Route:** Google Maps highlights the quickest path
4. ✅ **Dynamic Updates:** Route recalculates as rider completes deliveries
5. ✅ **Multi-stop Display:** Visual representation of all stops in route header

## 🚀 Future Enhancements

1. **Real-time Tracking:** Show rider's live GPS location on map
2. **Live ETA Calculation:** Dynamic estimated arrival based on current location and traffic
3. **Route History:** Archive completed routes for business analytics
4. **Customer Notifications:** SMS/Email updates when rider is nearby
5. **Manual Route Reordering:** Allow business to manually override optimal route
6. **Traffic Alerts:** Notify rider of traffic conditions and suggest alternate routes
7. **Delivery Time Windows:** Set preferred delivery times for each drop-off
8. **Route Analytics:** Distance traveled, fuel estimates, time spent per delivery

## 📦 Data Models

See `src/types/delivery.ts` for complete TypeScript interfaces:
- `Delivery`: Main delivery entity
- `DropOff`: Individual drop-off location
- `Location`: Address with coordinates
- `DeliveryStatus`: Status tracking

