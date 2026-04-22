import { useEffect, useState } from 'react';
import { Bell, LogOut, Menu, MessageCircle, MoreHorizontal, User } from 'lucide-react';
import { SideMenu, type AppNav } from './SideMenu';
import { VersaBankLogo } from './ui/VersaBankLogo';
import { useI18n } from '../lib/i18n';

type TopBarProps = {
  onNavigate: (to: AppNav) => void;
  activeMenuKey?: Parameters<typeof SideMenu>[0]['activeKey'];
  showLogout?: boolean;
  onLogout?: () => void;
};

export function TopBar({ onNavigate, activeMenuKey, showLogout, onLogout }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isLoggedIn = !!showLogout;
  const { language, setLanguage, languages, t } = useI18n();

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    const onClick = () => setMoreOpen(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onClick);
    };
  }, [moreOpen]);

  return (
    <>
      <div className="sticky top-0 z-40 bg-[#0b4a90]">
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="flex h-14 items-center justify-between">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
              aria-label={t('topbar.menu')}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <VersaBankLogo variant="compact" iconSize={32} className="select-none" />

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
                aria-label={t('topbar.notifications')}
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
                  aria-label={t('topbar.more')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreOpen((v) => !v);
                  }}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {moreOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-white/15 bg-[#0b4a90] shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                      onClick={() => {
                        setMoreOpen(false);
                        onNavigate('profile');
                      }}
                    >
                      <User className="h-4 w-4 text-white/90" />
                      {t('common.profile')}
                    </button>

                    <div className="border-b border-white/10 px-4 py-3">
                      <div className="text-xs font-extrabold tracking-wide text-white/75">{t('common.language')}</div>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as never)}
                        className="mt-2 h-9 w-full rounded-md border border-white/20 bg-white/10 px-2 text-sm font-bold text-white outline-none"
                      >
                        {languages.map((l) => (
                          <option key={l.code} value={l.code} className="text-slate-900">
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                      onClick={() => {
                        setMoreOpen(false);
                        if (isLoggedIn) onLogout?.();
                        onNavigate('auth');
                      }}
                    >
                      <LogOut className="h-4 w-4 text-white/90" />
                      {t('common.logout')}
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
                      onClick={() => {
                        setMoreOpen(false);
                        onNavigate('live-chat');
                      }}
                    >
                      <MessageCircle className="h-4 w-4 text-white/90" />
                      {t('common.liveChat')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SideMenu
        open={open}
        onClose={() => setOpen(false)}
        onNavigate={onNavigate}
        activeKey={activeMenuKey}
        showLogout={showLogout}
        onLogout={onLogout}
      />
    </>
  );
}
