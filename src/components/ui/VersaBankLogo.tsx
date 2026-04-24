type VersaBankLogoProps = {
  variant?: 'compact' | 'full';
  className?: string;
  iconSize?: number;
  textClassName?: string;
};

export function VersaBankLogo({ variant = 'compact', className = '', iconSize = 36, textClassName = '' }: VersaBankLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="vb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1f5fbf" />
            <stop offset="1" stopColor="#0b4a90" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#vb_g)" />
        <path
          d="M16 18h10l6 14 6-14h10L34 46h-4L16 18z"
          fill="#ffffff"
          opacity="0.9"
        />
        <path
          d="M22 18h8l4 10 4-10h8L34 40h-4L22 18z"
          fill="#ffffff"
          opacity="0.6"
        />
      </svg>

      <div className={textClassName}>
        <div className="leading-none">
          <span className="text-[22px] font-semibold text-white">Accred</span>
          <span className="text-[22px] font-extrabold text-white">ited</span>
        </div>
        {variant === 'full' && (
          <div className="mt-1 text-[11px] font-semibold text-white/70">Choice Through Innovation</div>
        )}
      </div>
    </div>
  );
}
