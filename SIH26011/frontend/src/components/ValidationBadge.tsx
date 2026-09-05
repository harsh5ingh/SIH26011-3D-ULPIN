import React from 'react';
import { VerificationStatus } from '../types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

interface ValidationBadgeProps {
  status: VerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'APPROVED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: 'Officially Verified',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-300'
        };
      case 'UNDER_REVIEW':
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'Under Official Review',
          classes: 'bg-amber-50 text-amber-700 border-amber-300'
        };
      case 'CORRECTION_REQUIRED':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: 'Correction Required',
          classes: 'bg-rose-50 text-rose-700 border-rose-300'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: 'Rejected',
          classes: 'bg-red-50 text-red-700 border-red-300'
        };
      default:
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Pending Verification',
          classes: 'bg-slate-100 text-slate-700 border-slate-300'
        };
    }
  };

  const config = getBadgeConfig();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center space-x-1.5 rounded-full font-semibold border shadow-2xs ${padding} ${config.classes}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
