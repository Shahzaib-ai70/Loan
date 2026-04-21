export const UpgradeLogo = ({ className = "h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 140 32" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Upgrade Logo"
  >
    <path 
      d="M16 0C7.16344 0 0 7.16344 0 16V28H8V16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16V28H32V16C32 7.16344 24.8366 0 16 0Z" 
      fill="#107c10"
    />
    <rect x="0" y="0" width="8" height="20" fill="#107c10" />
    
    <text 
      x="42" 
      y="24" 
      fontFamily="Arial, sans-serif" 
      fontWeight="bold" 
      fontSize="24" 
      fill="#1a1f2c"
      letterSpacing="-0.5"
    >
      upgrade
    </text>
  </svg>
);
