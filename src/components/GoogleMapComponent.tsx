import { APIProvider, Map, Marker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { Location } from '@/types/delivery';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GoogleMapComponentProps {
  apiKey: string;
  pickupLocation?: Location;
  dropOffLocations?: Location[];
  currentLocation?: Location;
  showRoute?: boolean;
}

const MapContent = ({ 
  pickupLocation, 
  dropOffLocations = [], 
  currentLocation,
  showRoute 
}: Omit<GoogleMapComponentProps, 'apiKey'>) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !showRoute) return;
    if (!pickupLocation || dropOffLocations.length === 0) return;

    const waypoints = dropOffLocations.map(loc => ({
      location: { lat: loc.lat, lng: loc.lng },
      stopover: true,
    }));

    directionsService
      .route({
        origin: { lat: pickupLocation.lat, lng: pickupLocation.lng },
        destination: { 
          lat: dropOffLocations[dropOffLocations.length - 1].lat, 
          lng: dropOffLocations[dropOffLocations.length - 1].lng 
        },
        waypoints: waypoints.slice(0, -1),
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then(response => {
        directionsRenderer.setDirections(response);
      })
      .catch(e => console.error('Directions request failed:', e));
  }, [directionsService, directionsRenderer, pickupLocation, dropOffLocations, showRoute]);

  const center = currentLocation || pickupLocation || { lat: 14.5995, lng: 120.9842 }; // Manila as default

  return (
    <Map
      defaultCenter={center}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapId="quickhop-map"
    >
      {currentLocation && (
        <Marker 
          position={currentLocation} 
          title="Current Location"
        />
      )}
      {!showRoute && pickupLocation && (
        <Marker 
          position={pickupLocation} 
          title="Pickup Location"
        />
      )}
      {!showRoute && dropOffLocations.map((loc, idx) => (
        <Marker 
          key={idx}
          position={loc} 
          title={`Drop-off ${idx + 1}`}
        />
      ))}
    </Map>
  );
};

export const GoogleMapComponent = (props: GoogleMapComponentProps) => {
  const [apiKey, setApiKey] = useState(props.apiKey || localStorage.getItem('google_maps_api_key') || '');
  const [tempApiKey, setTempApiKey] = useState('');

  const handleSaveApiKey = () => {
    if (!tempApiKey) {
      toast.error('Please enter a valid API key');
      return;
    }
    localStorage.setItem('google_maps_api_key', tempApiKey);
    setApiKey(tempApiKey);
    toast.success('Google Maps API key saved');
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg p-8">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Google Maps API Key Required</h3>
            <p className="text-sm text-muted-foreground">
              To use the map features, please enter your Google Maps API key. 
              Get one from the <a 
                href="https://console.cloud.google.com/google/maps-apis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Cloud Console
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter Google Maps API Key"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
            />
            <Button onClick={handleSaveApiKey}>Save</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <MapContent {...props} />
    </APIProvider>
  );
};
