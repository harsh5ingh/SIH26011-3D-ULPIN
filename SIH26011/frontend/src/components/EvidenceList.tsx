import React from 'react';
import { Evidence } from '../types';
import { FileCheck, Camera, Radio, Compass, Mountain, Cpu, Layers } from 'lucide-react';

interface EvidenceListProps {
  evidences: Evidence[];
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ evidences }) => {
  if (evidences.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        No spatial evidence records attached.
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'DRONE_IMAGERY':
        return <Camera className="w-4 h-4 text-sky-500" />;
      case 'LIDAR':
      case 'POINT_CLOUD':
        return <Radio className="w-4 h-4 text-purple-500" />;
      case 'GNSS_CORS':
        return <Compass className="w-4 h-4 text-emerald-500" />;
      case 'DEM':
      case 'DSM':
        return <Mountain className="w-4 h-4 text-amber-500" />;
      case 'AI_DERIVED':
        return <Cpu className="w-4 h-4 text-rose-500" />;
      default:
        return <Layers className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Attached Spatial Evidence ({evidences.length})
        </h4>
        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          SYNTHETIC DEMO DATA
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {evidences.map((e) => (
          <div
            key={e.id}
            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col justify-between space-y-1"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded bg-white shadow-xs border border-slate-200">
                  {getIcon(e.source_type)}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {e.source_type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {e.processing_method}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {e.quality_score}%
              </span>
            </div>

            <p className="text-[11px] text-slate-600 truncate" title={e.source_reference}>
              {e.source_reference}
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
              <span>Date: {e.acquisition_date}</span>
              <span className="text-blue-600 font-medium">Verified Source</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
