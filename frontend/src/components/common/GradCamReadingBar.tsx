import React, { useState } from 'react';

interface GradCamReadingBarProps {
  variant?: 'overlay' | 'inline';
  orientation?: 'horizontal' | 'vertical';
  language?: string;
  className?: string;
  showTicks?: boolean;
}

export const GradCamReadingBar: React.FC<GradCamReadingBarProps> = ({
  variant = 'overlay',
  orientation = 'horizontal',
  language = 'en',
  className = '',
  showTicks = true,
}) => {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let pct = 0;
    if (orientation === 'horizontal') {
      pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    } else {
      pct = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
    }
    setHoverVal(Math.round(pct));
  };

  const handleMouseLeave = () => setHoverVal(null);

  if (variant === 'overlay') {
    return (
      <div
        className={`bg-black/85 backdrop-blur-md border border-white/20 rounded-xl p-2.5 shadow-2xl text-white select-none transition-all ${className}`}
        aria-label="Grad-CAM Reading Scale Bar"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5252] animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/90">
              {language === 'hi' ? 'ग्रेड-सीएएम रीडिंग बार' : 'Grad-CAM Scale'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-300">
            {hoverVal !== null ? `${(hoverVal / 100).toFixed(2)} (${hoverVal}%)` : '0.0 — 1.0'}
          </span>
        </div>

        {/* Spectrum Bar */}
        <div
          className="relative group cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`rounded-lg shadow-inner border border-white/30 ${
              orientation === 'horizontal'
                ? 'h-3.5 w-full bg-[linear-gradient(90deg,#000080_0%,#0055ff_20%,#00e5ff_40%,#00ff66_60%,#ffea00_80%,#ff0000_100%)]'
                : 'w-3.5 h-36 bg-[linear-gradient(0deg,#000080_0%,#0055ff_20%,#00e5ff_40%,#00ff66_60%,#ffea00_80%,#ff0000_100%)]'
            }`}
          ></div>

          {/* Interactive hover indicator pin */}
          {hoverVal !== null && (
            <div
              className={`absolute pointer-events-none transition-all ${
                orientation === 'horizontal'
                  ? '-top-1 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#ffffff]'
                  : '-left-1 right-0 h-0.5 bg-white shadow-[0_0_8px_#ffffff]'
              }`}
              style={
                orientation === 'horizontal'
                  ? { left: `${hoverVal}%` }
                  : { bottom: `${hoverVal}%` }
              }
            >
              <div className="absolute -top-4 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-1 rounded font-mono shadow-md whitespace-nowrap">
                {(hoverVal / 100).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Ticks and Scale Labels */}
        {showTicks && (
          <div className="flex justify-between items-center mt-1 text-[9px] font-mono text-white/70 font-semibold px-0.5">
            <span>0.0</span>
            <span>0.25</span>
            <span>0.50</span>
            <span>0.75</span>
            <span>1.0</span>
          </div>
        )}

        <div className="flex justify-between items-center text-[9px] text-white/60 mt-0.5 px-0.5">
          <span>{language === 'hi' ? 'कम ध्यान' : 'Low Attention'}</span>
          <span>{language === 'hi' ? 'उच्चतम प्रभाव' : 'High Focus'}</span>
        </div>
      </div>
    );
  }

  // Inline Variant (Full Panel Display)
  return (
    <div
      className={`bg-surface-container-low border border-surface-container p-3 rounded-xl shadow-2xs space-y-2 select-none ${className}`}
      aria-label="Grad-CAM Activation Reading Bar"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">palette</span>
          <span className="text-xs font-bold text-primary font-mono uppercase tracking-wide">
            {language === 'hi' ? 'ग्रेड-सीएएम स्पेक्ट्रम रीडिंग बार' : 'Grad-CAM Activation Scale Bar'}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-secondary">
          {hoverVal !== null ? `Activation: ${(hoverVal / 100).toFixed(2)} (${hoverVal}%)` : 'Scale: 0.00 to 1.00'}
        </span>
      </div>

      <div
        className="relative group cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="h-4 w-full rounded-lg shadow-inner border border-outline-variant bg-[linear-gradient(90deg,#000080_0%,#0055ff_20%,#00e5ff_40%,#00ff66_60%,#ffea00_80%,#ff0000_100%)]"></div>

        {hoverVal !== null && (
          <div
            className="absolute -top-1 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#ffffff] pointer-events-none"
            style={{ left: `${hoverVal}%` }}
          >
            <div className="absolute -top-5 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shadow-sm">
              {(hoverVal / 100).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant font-medium pt-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#000080]"></span>
          <span>0.0 ({language === 'hi' ? 'सामान्य / कम प्रभाव' : 'Low Feature Impact'})</span>
        </span>
        <span className="flex items-center gap-1">
          <span>0.50 ({language === 'hi' ? 'मध्यम ध्यान' : 'Moderate Focus'})</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#FF0000]"></span>
          <span>1.0 ({language === 'hi' ? 'उच्चतम प्रभाव' : 'High Lesion Focus'})</span>
        </span>
      </div>
    </div>
  );
};
