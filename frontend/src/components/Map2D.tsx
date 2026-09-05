import React from 'react';
import { Parcel, Building, PropertyUnit } from '../types';
import { MapPin, Maximize2 } from 'lucide-react';

interface Map2DProps {
  parcel?: Parcel;
  building?: Building;
  selectedUnit?: PropertyUnit;
}

export const Map2D: React.FC<Map2DProps> = ({ parcel, building, selectedUnit }) => {
  if (!parcel) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-400">
        <MapPin className="w-8 h-8 mb-2 stroke-1" />
        <p className="text-sm font-medium">Select a parcel to view 2D Cadastral boundary</p>
      </div>
    );
  }

  // Calculate SVG bounds from parcel coordinates
  const coords = parcel.geometry_2d;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const deltaLng = Math.max(0.0001, maxLng - minLng);
  const deltaLat = Math.max(0.0001, maxLat - minLat);

  // Projection helper to SVG viewBox (width: 400, height: 300, padding: 30)
  const pad = 35;
  const w = 400 - pad * 2;
  const h = 300 - pad * 2;

  const project = (lng: number, lat: number) => {
    const x = pad + ((lng - minLng) / deltaLng) * w;
    const y = 300 - (pad + ((lat - minLat) / deltaLat) * h);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const parcelPoints = coords.map((c) => project(c[0], c[1])).join(' ');

  const buildingPoints = building
    ? building.footprint_2d.map((c) => project(c[0], c[1])).join(' ')
    : '';

  const unitPoints = selectedUnit
    ? selectedUnit.footprint_2d.map((c) => project(c[0], c[1])).join(' ')
    : '';

  return (
    <div className="relative bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2D Cadastral Layer ({parcel.area_type})
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-500">
          Area: {parcel.area_sqm.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
        </span>
      </div>

      <div className="relative w-full h-56 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-40"></div>

        <svg viewBox="0 0 400 300" className="w-full h-full relative z-10">
          {/* Parcel Boundary */}
          <polygon
            points={parcelPoints}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />

          {/* Building Footprint */}
          {buildingPoints && (
            <polygon
              points={buildingPoints}
              fill="rgba(245, 158, 11, 0.25)"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          )}

          {/* Selected Unit Footprint */}
          {unitPoints && (
            <polygon
              points={unitPoints}
              fill="rgba(16, 185, 129, 0.5)"
              stroke="#10b981"
              strokeWidth="2.5"
            />
          )}

          {/* Corner labels */}
          <text x="12" y="24" fill="#94a3b8" fontSize="10" fontFamily="monospace">
            {parcel.locality} ({parcel.parcel_code})
          </text>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center space-x-3 bg-slate-950/80 px-2.5 py-1 rounded backdrop-blur text-[10px] text-slate-300 z-20">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-1.5 bg-blue-500 rounded-sm"></span>
            <span>Parcel</span>
          </div>
          {building && (
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-1.5 bg-amber-500 rounded-sm"></span>
              <span>Building</span>
            </div>
          )}
          {selectedUnit && (
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-1.5 bg-emerald-500 rounded-sm"></span>
              <span>Selected Unit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
