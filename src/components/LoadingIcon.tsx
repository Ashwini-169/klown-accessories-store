import React from 'react';

interface LoadingIconProps {
  category: string;
  className?: string;
}

const LoadingIcon: React.FC<LoadingIconProps> = ({ category, className = "w-full h-full" }) => {
  const getIcon = () => {
    switch (category) {
      case 'bracelets':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="5,5">
              <animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.5"/>
          </svg>
        );
      case 'rings':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="6"/>
            <circle cx="50" cy="30" r="8" fill="currentColor">
              <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
      case 'necklaces':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            <path d="M20 30 Q50 60 80 30" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="3,3">
              <animate attributeName="stroke-dashoffset" values="0;-20" dur="1s" repeatCount="indefinite"/>
            </path>
            <circle cx="50" cy="45" r="6" fill="currentColor">
              <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
      case 'earrings':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            <circle cx="35" cy="30" r="4" fill="currentColor"/>
            <circle cx="65" cy="30" r="4" fill="currentColor"/>
            <circle cx="35" cy="50" r="6" fill="currentColor">
              <animate attributeName="cy" values="50;55;50" dur="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx="65" cy="50" r="6" fill="currentColor">
              <animate attributeName="cy" values="50;55;50" dur="1s" repeatCount="indefinite" begin="0.5s"/>
            </circle>
          </svg>
        );
      case 'keyrings':
        return (
          <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            <circle cx="40" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="4"/>
            <rect x="55" y="35" width="20" height="10" rx="2" fill="currentColor">
              <animate attributeName="x" values="55;60;55" dur="1s" repeatCount="indefinite"/>
            </rect>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 100 100" className={className} fill="currentColor">
            <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="31.416" strokeDashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
    }
  };

  return (
    <div className="flex items-center justify-center text-gray-400">
      {getIcon()}
    </div>
  );
};

export default LoadingIcon;