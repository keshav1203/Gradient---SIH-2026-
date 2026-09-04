import React from 'react';

interface DrishtikonLogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  size?: number;
}

export const DrishtikonLogo: React.FC<DrishtikonLogoProps> = ({
  className = '',
  showText = true,
  textColor = 'text-primary dark:text-primary-fixed-dim',
  size = 32,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Pristine Eye SVG Vector */}
      <div 
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#002431] to-[#073B4C] text-white shadow-sm flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6"
        >
          {/* Eye Contour */}
          <path 
            d="M3 16C3 16 7.5 7.5 16 7.5C24.5 7.5 29 16 29 16C29 16 24.5 24.5 16 24.5C7.5 24.5 3 16 3 16Z" 
            stroke="#A2CDE2" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          {/* Iris Outer Ring */}
          <circle 
            cx="16" 
            cy="16" 
            r="5.5" 
            stroke="#FFFFFF" 
            strokeWidth="1.8" 
          />
          {/* Pupil / AI Core */}
          <circle 
            cx="16" 
            cy="16" 
            r="2.5" 
            fill="#BDE9FF" 
          />
          {/* Iris AI Ray Dots */}
          <circle cx="16" cy="11.5" r="0.8" fill="#7BA5B9" />
          <circle cx="16" cy="20.5" r="0.8" fill="#7BA5B9" />
          <circle cx="11.5" cy="16" r="0.8" fill="#7BA5B9" />
          <circle cx="20.5" cy="16" r="0.8" fill="#7BA5B9" />
        </svg>
      </div>

      {showText && (
        <span className={`text-headline-md font-headline-md font-bold tracking-tight ${textColor}`}>
          Drishtikon
        </span>
      )}
    </div>
  );
};
