import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type ?? 'button'}
        className={cn(
          'inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[#107c10] text-white hover:bg-[#0b5c0b] shadow-sm hover:shadow-md': variant === 'primary',
            'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50': variant === 'secondary',
            'border-2 border-[#27D38C] text-[#27D38C] hover:bg-green-50': variant === 'outline',
            'text-gray-600 hover:text-gray-900 hover:bg-gray-100': variant === 'ghost',
            'h-10 px-6 text-sm': size === 'sm',
            'h-12 px-8 text-base': size === 'md',
            'h-16 px-10 text-lg': size === 'lg',
          },
          'rounded-full',
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
