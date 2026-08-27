'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
  color?: string;
}

export function LocationMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // redraw only when the actual positions change, not on every parent render
  const key = JSON.stringify(points.map((p) => [p.id, p.lat, p.lng, p.updatedAt]));

  useEffect(() => {
    let cancelled = false;
    const points = pointsRef.current;

    async function render() {
      if (!containerRef.current || points.length === 0) return;
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const layer = layerRef.current!;
      layer.clearLayers();

      for (const p of points) {
        const min = Math.round((Date.now() - p.updatedAt) / 60000);
        const ago = min < 1 ? 'právě teď' : min < 60 ? `před ${min} min` : `před ${Math.floor(min / 60)} h`;
        L.circle([p.lat, p.lng], {
          radius: Math.max(p.accuracy, 15),
          color: p.color ?? '#2563eb',
          fillColor: p.color ?? '#2563eb',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(layer);
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);width:max-content">
              <span style="background:${p.color ?? '#2563eb'};color:#fff;font-size:11px;font-weight:600;padding:2px 6px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3)">${p.name} · ${ago}</span>
              <span style="width:10px;height:10px;background:${p.color ?? '#2563eb'};border:2px solid #fff;border-radius:50%;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>
            </div>`,
            iconSize: [0, 0],
          }),
        }).addTo(layer);
      }

      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      mapRef.current.fitBounds(bounds.pad(0.3), { maxZoom: 16 });
    }

    void render();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // tear the map down on unmount
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    },
    [],
  );

  if (points.length === 0) return null;
  return <div ref={containerRef} className="h-64 w-full rounded-xl" />;
}
