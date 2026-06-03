/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { HeritageSite } from '../types';
import { Compass, Navigation, Locate } from 'lucide-react';

interface MapComponentProps {
  sites: HeritageSite[];
  selectedSite: HeritageSite | null;
  onSiteSelect: (site: HeritageSite) => void;
  userCoords: { latitude: number; longitude: number } | null;
  onGpsTrigger: () => void;
  isGpsLoading: boolean;
}

export default function MapComponent({
  sites,
  selectedSite,
  onSiteSelect,
  userCoords,
  onGpsTrigger,
  isGpsLoading
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize the Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default to Center of Yangon, Myanmar
    const initialLat = selectedSite ? selectedSite.latitude : 16.7900;
    const initialLng = selectedSite ? selectedSite.longitude : 96.1600;
    const initialZoom = selectedSite ? 14 : 13;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false, // Custom position
      minZoom: 11,
      maxBounds: [[16.3, 95.8], [17.3, 96.5]] // Restrict pan area strictly around Yangon & immediate surroundings
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Custom zoom selector
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    mapInstanceRef.current = map;

    // Handle map resize container logic nicely
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Markers to sites list
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    // Clear previous markers
    markersGroup.clearLayers();

    sites.forEach((site) => {
      const isSelected = selectedSite?.id === site.id;

      // Dynamic pin style based on Category and Selection State
      const categoryColors: Record<string, string> = {
        Historic: 'bg-emerald-600',
        Cultural: 'bg-violet-600',
        Natural: 'bg-teal-600',
        Archeological: 'bg-amber-600'
      };
      
      const pinColor = categoryColors[site.category] || 'bg-[#e89d1b]';
      const scaleStyle = isSelected ? 'scale-125 z-[999] border-white ring-4 ring-emerald-400/50' : 'scale-100 hover:scale-110';

      const customPin = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center transition-all duration-300 ${scaleStyle}">
            <div class="absolute -top-10 bg-slate-900 text-white text-[10px] uppercase tracking-wide px-2 py-0.5 rounded shadow-md whitespace-nowrap opacity-0 hover:opacity-100 pointer-events-none transition-opacity duration-200">
              ${site.name}
            </div>
            <div class="w-8 h-8 rounded-full ${pinColor} border-2 border-white shadow-xl flex items-center justify-center">
              <span class="text-white text-[10px] font-bold">🏛️</span>
            </div>
            <div class="absolute bottom-[-6px] border-solid border-t-8 border-t-white border-x-transparent border-x-4 border-b-0 w-0 h-0"></div>
          </div>
        `,
        className: 'custom-heritage-pin',
        iconSize: [32, 40],
        iconAnchor: [16, 40]
      });

      const marker = L.marker([site.latitude, site.longitude], { icon: customPin });
      marker.on('click', () => {
        onSiteSelect(site);
      });
      markersGroup.addLayer(marker);
    });

    // Auto fit viewport bounds initially if there's no selection but has items
    if (sites.length > 0 && !selectedSite && !userCoords) {
      // Just center to first element or show all if within threshold
      try {
        const bounds = markersGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
        }
      } catch (err) {
        // Safe fallback
      }
    }
  }, [sites, selectedSite]);

  // Sync GPS coordinate
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    const { latitude, longitude } = userCoords;

    const gpsPin = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-blue-500/25 rounded-full animate-ping"></div>
          <div class="w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-full bg-radial"></div>
          </div>
        </div>
      `,
      className: 'gps-identity-pin',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      userMarkerRef.current = L.marker([latitude, longitude], { icon: gpsPin }).addTo(map);
    }
  }, [userCoords]);

  // Pan to Selected Site
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedSite) return;

    map.setView([selectedSite.latitude, selectedSite.longitude], 15, {
      animate: true,
      duration: 1.0
    });
  }, [selectedSite]);

  return (
    <div className="relative w-full h-[320px] rounded-3xl overflow-hidden shadow-inner border border-white/60 bg-white/20 backdrop-blur-md">
      {/* Map Element */}
      <div id="map" ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Geolocate Button Overlay */}
      <button
        id="geolocate-action-btn"
        onClick={onGpsTrigger}
        disabled={isGpsLoading}
        className="absolute bottom-4 left-4 z-[400] flex items-center gap-2 px-3.5 py-2.5 bg-white/60 backdrop-blur-md hover:bg-white/90 text-slate-800 rounded-2xl shadow-lg border border-white/80 font-bold text-xs transition duration-200 active:scale-95 disabled:opacity-70 cursor-pointer"
      >
        <Locate className={`w-4 h-4 text-emerald-600 ${isGpsLoading ? 'animate-spin' : ''}`} />
        <span>{userCoords ? "GPS Active" : "Find My Location"}</span>
      </button>

      {/* Key Legend Overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-white/60 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-white/80 text-[10px] text-slate-700 flex flex-col gap-1.5 pointer-events-auto">
        <span className="font-bold text-slate-800 mb-0.5">Heritage Guide</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
          <span className="font-semibold">Historic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block"></span>
          <span className="font-semibold">Cultural</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block"></span>
          <span className="font-semibold">Natural</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block"></span>
          <span className="font-semibold">Archeological</span>
        </div>
      </div>
    </div>
  );
}
