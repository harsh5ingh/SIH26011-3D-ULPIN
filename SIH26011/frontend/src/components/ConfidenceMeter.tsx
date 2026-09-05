import React from 'react';
import { ConfidenceScore } from '../types';
import { Gauge, Info } from 'lucide-react';

interface ConfidenceMeterProps {
  confidence?: ConfidenceScore;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ confidence }) => {
  if (!confidence) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        Calculating confidence...
      </div>
    );
  }

  const score = confidence.overall_score;
  const getColor = (val: number) => {
    if (val >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (val >= 65) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getBarColor = (val: number) => {
    if (val >= 85) return 'bg-emerald-500';
    if (val >= 65) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Gauge className="w-5 h-5 text-blue-900" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Technical Confidence Score
            </h4>
            <span className="text-[10px] text-slate-400">Prototype Multi-Factor Spatial Index</span>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-lg border font-extrabold text-base ${getColor(score)}`}>
          {score}%
        </div>
      </div>

      {/* Main Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>

      {/* 5 Factors Breakdown */}
      <div className="grid grid-cols-5 gap-2 pt-1 text-center">
        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-500 block">Evidence (25%)</span>
          <span className="text-xs font-bold text-slate-800">{confidence.evidence_completeness}%</span>
        </div>
        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-500 block">Geometry (25%)</span>
          <span className="text-xs font-bold text-slate-800">{confidence.geometry_quality}%</span>
        </div>
        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-500 block">Position (20%)</span>
          <span className="text-xs font-bold text-slate-800">{confidence.positional_quality}%</span>
        </div>
        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-500 block">Agreement (20%)</span>
          <span className="text-xs font-bold text-slate-800">{confidence.cross_source_agreement}%</span>
        </div>
        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-500 block">Rules (10%)</span>
          <span className="text-xs font-bold text-slate-800">{confidence.validation_score}%</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start space-x-1.5 text-[11px] text-slate-500 bg-blue-50/70 p-2 rounded-lg border border-blue-100">
        <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
        <p className="leading-tight">
          <strong>Notice:</strong> This score indicates spatial data consistency and sensor evidence completeness. It does not certify legal ownership or title registry.
        </p>
      </div>
    </div>
  );
};
