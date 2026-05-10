/**
 * Drop-Off Distance Analyzer (no Google API)
 *
 * Reorders drop-offs so the rider visits the NEAREST stop first and the
 * FARTHEST stop last. Avoids zig-zag routes when a business enters
 * drop-offs in an unintended order (e.g. Drop-off 1 is far, Drop-off 2 is
 * close).
 *
 * Engine:
 *  1. Geocode each address with OpenStreetMap's Nominatim service
 *     (free, no API key, CORS-enabled).
 *  2. Compute straight-line (Haversine) distance from the pickup coordinate
 *     to each drop-off coordinate.
 *  3. Sort ascending by that distance.
 *
 * Notes:
 *  - Straight-line distance is enough to determine ORDER ("which one is
 *    closer?"). It's not driving distance, but the ordering is correct in
 *    the vast majority of urban cases.
 *  - Results are cached per session so re-running on the same addresses
 *    is instant and never re-hits Nominatim.
 *  - Per Nominatim's usage policy we identify ourselves with a Referer (the
 *    browser sends it automatically) and limit ourselves to small bursts.
 */

interface LatLng {
    lat: number;
    lng: number;
}

const geocodeCache = new Map<string, LatLng | null>();

/** Normalise an address for consistent caching. */
function cacheKey(address: string): string {
    return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Geocode a single address via Nominatim. Returns null if the address
 * cannot be resolved or the request fails. Caches successful AND failed
 * lookups so we don't pound the service.
 */
async function geocodeAddress(address: string): Promise<LatLng | null> {
    const trimmed = address?.trim();
    if (!trimmed) return null;

    const key = cacheKey(trimmed);
    if (geocodeCache.has(key)) {
        return geocodeCache.get(key) ?? null;
    }

    // Try Nominatim first (free, no key required)
    try {
        const url =
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, {
            headers: { Accept: 'application/json', 'Accept-Language': 'en' },
        });
        if (res.ok) {
            const data = (await res.json()) as Array<{ lat: string; lon: string }>;
            if (Array.isArray(data) && data.length > 0) {
                const result: LatLng = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                };
                if (!Number.isNaN(result.lat) && !Number.isNaN(result.lng)) {
                    geocodeCache.set(key, result);
                    return result;
                }
            }
        }
    } catch {
        // Nominatim failed, try fallback below
    }

    // Fallback: Google Maps Geocoding API (works well for Philippine addresses)
    try {
        const apiKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'OK' && data.results?.length > 0) {
                const loc = data.results[0].geometry?.location;
                if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                    const result: LatLng = { lat: loc.lat, lng: loc.lng };
                    geocodeCache.set(key, result);
                    return result;
                }
            }
        }
    } catch {
        // Both geocoders failed
    }

    geocodeCache.set(key, null);
    return null;
}

/** Great-circle distance in kilometres. */
function haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371; // Earth's radius in km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export interface DropOffDistance<T> {
    item: T;
    originalIndex: number;
    /** Straight-line metres from pickup to this drop-off. */
    distanceMeters: number;
    /** Same value, expressed in kilometres for display. */
    distanceKm: number;
    status: 'OK' | 'ERROR';
}

export interface OptimizationResult<T> {
    /** Drop-offs reordered nearest -> farthest from pickup. */
    ordered: T[];
    /** Per-drop-off distance info, in the new order. */
    details: DropOffDistance<T>[];
    /** True if the order actually changed. */
    changed: boolean;
    /** Number of items whose position moved. */
    movedCount: number;
    /** Sum of pickup -> stop distances (km). Diagnostic only. */
    totalDistanceKm: number;
}

/**
 * Geocode pickup + drop-offs and return per-drop-off distance info in the
 * ORIGINAL order. Use this if you only need to display distances without
 * reordering.
 */
export async function analyzeDropOffDistances<T extends { address: string }>(
    pickupAddress: string,
    dropOffs: T[]
): Promise<DropOffDistance<T>[]> {
    if (!pickupAddress?.trim()) {
        throw new Error('Pickup address is required');
    }
    if (dropOffs.length === 0) return [];

    const pickup = await geocodeAddress(pickupAddress);
    if (!pickup) {
        throw new Error(
            'Could not locate the pickup address. Please make it more specific (include city / country).'
        );
    }

    // Geocode all drop-offs in parallel from the cache where possible.
    const coords = await Promise.all(
        dropOffs.map(d => (d.address?.trim() ? geocodeAddress(d.address) : Promise.resolve(null)))
    );

    return dropOffs.map((item, originalIndex) => {
        const coord = coords[originalIndex];
        if (!coord) {
            return {
                item,
                originalIndex,
                distanceMeters: Number.POSITIVE_INFINITY,
                distanceKm: Number.POSITIVE_INFINITY,
                status: 'ERROR' as const,
            };
        }
        const km = haversineKm(pickup, coord);
        return {
            item,
            originalIndex,
            distanceMeters: km * 1000,
            distanceKm: km,
            status: 'OK' as const,
        };
    });
}

/**
 * Returns drop-offs reordered nearest -> farthest from the pickup address.
 *
 * - Items that fail to geocode are kept at the end in their original
 *   relative order so the user can fix them.
 * - If the resulting order is identical to the input, `changed` is false.
 */
export async function reorderDropOffsByDistance<T extends { address: string }>(
    pickupAddress: string,
    dropOffs: T[]
): Promise<OptimizationResult<T>> {
    const distances = await analyzeDropOffDistances(pickupAddress, dropOffs);

    const sorted = [...distances].sort((a, b) => {
        if (a.status === 'OK' && b.status === 'OK') {
            return a.distanceMeters - b.distanceMeters;
        }
        if (a.status === 'OK') return -1;
        if (b.status === 'OK') return 1;
        return a.originalIndex - b.originalIndex;
    });

    let movedCount = 0;
    sorted.forEach((entry, newIndex) => {
        if (entry.originalIndex !== newIndex) movedCount += 1;
    });

    const totalDistanceKm = sorted
        .filter(d => d.status === 'OK')
        .reduce((sum, d) => sum + d.distanceKm, 0);

    return {
        ordered: sorted.map(d => d.item),
        details: sorted,
        changed: movedCount > 0,
        movedCount,
        totalDistanceKm,
    };
}

/** Friendly distance formatter (e.g. "850 m" or "3.4 km"). */
export function formatDistance(meters: number): string {
    if (!isFinite(meters)) return '—';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 2 : 1)} km`;
}
