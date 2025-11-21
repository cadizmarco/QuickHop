import { Card } from './ui/card';
import { Map, MapPin, Navigation } from 'lucide-react';

interface RouteViewerProps {
  startLocation: string;
  endLocation: string;
  waypoints?: string[]; // Optional intermediate stops
  showMap: boolean;
}

export const RouteViewer = ({ startLocation, endLocation, waypoints = [], showMap }: RouteViewerProps) => {
  if (!showMap) {
    return (
      <Card className="glass h-full min-h-[500px] flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-muted rounded-3xl flex items-center justify-center mx-auto">
            <Map className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Ready to Navigate</h3>
            <p className="text-muted-foreground max-w-sm">
              Enter your starting location and destination to view the route on Google Maps
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Create Google Maps embed URL with directions and waypoints
  const origin = encodeURIComponent(startLocation);
  const destination = encodeURIComponent(endLocation);
  
  // Build waypoints parameter if there are intermediate stops
  let waypointsParam = '';
  if (waypoints && waypoints.length > 0) {
    const encodedWaypoints = waypoints
      .filter(wp => wp && wp.trim()) // Filter out empty waypoints
      .map(wp => encodeURIComponent(wp))
      .join('|');
    if (encodedWaypoints) {
      waypointsParam = `&waypoints=${encodedWaypoints}`;
    }
  }
  
  // Google Maps will automatically optimize the route and show the fastest path
  const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${destination}${waypointsParam}&mode=driving`;

  const totalStops = (waypoints?.length || 0) + 2; // Start + waypoints + end

  return (
    <Card className="glass h-full overflow-hidden flex flex-col">
      {/* Route Info Header */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">START</p>
            <p className="text-sm font-medium truncate">{startLocation}</p>
          </div>
        </div>
        
        {waypoints && waypoints.length > 0 && (
          <div className="space-y-2">
            {waypoints.map((waypoint, idx) => (
              waypoint && waypoint.trim() && (
                <div key={idx} className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">STOP {idx + 1}</p>
                    <p className="text-sm font-medium truncate">{waypoint}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        
        <div className="flex items-start gap-2">
          <Navigation className="w-4 h-4 text-secondary mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">FINAL DESTINATION</p>
            <p className="text-sm font-medium truncate">{endLocation}</p>
          </div>
        </div>
        
        {waypoints && waypoints.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              📍 {totalStops} stops • Route optimized for fastest delivery
            </p>
          </div>
        )}
      </div>

      {/* Embedded Google Maps */}
      <div className="flex-1 relative">
        <iframe
          src={mapUrl}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps Route"
        />
      </div>
    </Card>
  );
};

