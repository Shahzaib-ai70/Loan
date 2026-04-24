type VersaBankLogoProps = {
  variant?: 'compact' | 'full';
  className?: string;
  iconSize?: number;
  textClassName?: string;
};

export function VersaBankLogo({ variant = 'compact', className = '', iconSize = 36, textClassName = '' }: VersaBankLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ${className}`}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M23 41c-5.5 0-10-4.6-10-10.2C13 25.5 17.2 21 23 21c4.2 0 7.6 1.9 9.2 4.8l-5.2 2.4c-.7-1.4-2.1-2.3-4-2.3-2.6 0-4.8 2.3-4.8 4.9 0 2.7 2.1 5 4.8 5 2.1 0 3.6-1 4.2-2.6l5.3 2.2C31.1 39.1 27.4 41 23 41Z"
          fill="#1a86a8"
        />
        <path
          d="M36 22c6.1 0 11 4.7 11 10.5S42.1 43 36 43c-3.4 0-6.4-1.5-8.4-3.8v3.3h-5.4V18h5.4v3.7C29.6 19.2 32.6 22 36 22Zm-1 15.8c3.3 0 6-2.5 6-5.3 0-2.9-2.7-5.3-6-5.3-3.2 0-5.8 2.4-5.8 5.3 0 2.8 2.6 5.3 5.8 5.3Z"
          fill="#1a86a8"
          opacity="0"
        />
        <path
          d="M20 18c5-5 12.5-7 19.5-4.8"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>

      <div className={textClassName || 'leading-none'}>
        <div className="text-[20px] font-light tracking-wide text-slate-900">accredited</div>
        {variant === 'full' && (
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Debt Relief</div>
        )}
      </div>
    </div>
  );
}
