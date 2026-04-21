import { useEffect } from 'react';
import {
  Bell,
  HandCoins,
  Headset,
  HelpCircle,
  Home,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Newspaper,
  PhoneCall,
  PiggyBank,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { VersaBankLogo } from './ui/VersaBankLogo';

export type AppNav =
  | 'dashboard'
  | 'register'
  | 'loan-application'
  | 'application-status'
  | 'withdraw'
  | 'auth'
  | 'admin'
  | 'profile'
  | 'my-information'
  | 'loan-contract'
  | 'offers'
  | 'exchange-rates'
  | 'deposit-rates'
  | 'live-chat';

type MenuKey =
  | 'Home'
  | 'Online Loan'
  | 'Withdraw money'
  | 'Loan Status'
  | 'News'
  | 'FAQ'
  | 'Customer Service'
  | 'Contact'
  | 'Logout';

type MenuItem = {
  key: MenuKey;
  icon: LucideIcon;
  to: AppNav;
  show?: boolean;
  onClick?: () => void;
};

type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (to: AppNav) => void;
  activeKey?: MenuKey;
  showLogout?: boolean;
  onLogout?: () => void;
};

export function SideMenu({ open, onClose, onNavigate, activeKey, showLogout, onLogout }: SideMenuProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const items: MenuItem[] = [
    { key: 'Home', icon: Home, to: 'dashboard' },
    { key: 'Online Loan', icon: HandCoins, to: 'loan-application' },
    { key: 'Withdraw money', icon: PiggyBank, to: 'withdraw' },
    { key: 'Loan Status', icon: ShieldCheck, to: 'application-status' },
    { key: 'News', icon: Newspaper, to: 'dashboard' },
    { key: 'FAQ', icon: HelpCircle, to: 'dashboard' },
    { key: 'Customer Service', icon: Headset, to: 'live-chat' },
    { key: 'Contact', icon: PhoneCall, to: 'dashboard' },
    { key: 'Logout', icon: LogOut, to: 'auth', show: !!showLogout, onClick: onLogout },
  ];

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />

      <div className="absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-white shadow-2xl flex flex-col">
        <div className="bg-[#0b4a90]">
          <div className="flex h-14 items-center justify-between px-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center">
              <VersaBankLogo variant="full" iconSize={34} className="py-2" />
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
                aria-label="More"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
          <div className="divide-y divide-slate-200 border-b border-slate-200">
            {items
              .filter((i) => i.show ?? true)
              .map((item) => {
                const Icon = item.icon;
                const selected = activeKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold ${
                      selected ? 'bg-slate-200 text-slate-900' : 'bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      onClose();
                      item.onClick?.();
                      onNavigate(item.to);
                    }}
                  >
                    <Icon className="h-4 w-4 text-[#0b4a90]" />
                    <span className="flex-1">{item.key}</span>
                  </button>
                );
              })}
          </div>

          <div className="px-4 py-6 text-center">
            <div className="text-xs font-extrabold tracking-wide text-[#0b4a90]">HOTLINE</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">+1 773 322 9624</div>
          </div>

          <div className="px-4 pb-6">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#e21b23] py-3 text-sm font-extrabold text-white hover:bg-[#c9161d]"
              onClick={() => {
                onClose();
                onNavigate('auth');
              }}
            >
              <LockKeyhole className="h-4 w-4" />
              Electronic banking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
