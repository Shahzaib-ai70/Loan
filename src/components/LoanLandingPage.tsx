import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  CircleCheck,
  Headset,
  Percent,
  PiggyBank,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import heroImage from '../assets/hero-image.jpg';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useI18n } from '../lib/i18n';
import { formatCompactMoney, useCurrency } from '../lib/currency';

interface LoanLandingPageProps {
  onNavigate: (
    view:
      | 'dashboard'
      | 'register'
      | 'loan-application'
      | 'application-status'
      | 'withdraw'
      | 'auth'
      | 'admin'
      | 'offers'
      | 'exchange-rates'
      | 'deposit-rates'
      | 'live-chat',
  ) => void;
}

type Slide = {
  title: string;
  subtitle: string;
  image: string;
  badge: string;
};

export function LoanLandingPage({ onNavigate }: LoanLandingPageProps) {
  const { t } = useI18n();
  const { showCurrencySign, currencySymbol } = useCurrency();
  const slides = useMemo<Slide[]>(
    () => [
      {
        title: t('home.slides.1.title'),
        subtitle: t('home.slides.1.subtitle'),
        badge: t('home.slides.1.badge'),
        image: heroImage,
      },
      {
        title: t('home.slides.2.title'),
        subtitle: t('home.slides.2.subtitle'),
        badge: t('home.slides.2.badge'),
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1600',
      },
      {
        title: t('home.slides.3.title'),
        subtitle: t('home.slides.3.subtitle'),
        badge: t('home.slides.3.badge'),
        image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&q=80&w=1600',
      },
      {
        title: t('home.slides.4.title'),
        subtitle: t('home.slides.4.subtitle'),
        badge: t('home.slides.4.badge'),
        image: 'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&q=80&w=1600',
      },
    ],
    [t],
  );

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="bg-[#f5f8ff]">
        <div className="mx-auto max-w-[1100px]">
          <div className="relative overflow-hidden rounded-b-3xl">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {slides.map((s) => (
                <div key={s.title} className="relative w-full flex-none">
                  <img src={s.image} alt="" className="h-56 w-full object-cover sm:h-72" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0b4a90]/90 via-[#0b4a90]/45 to-transparent" />
                  <div className="absolute inset-0">
                    <div className="mx-auto flex h-full max-w-[1100px] flex-col justify-end px-4 pb-6 sm:pb-10">
                      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="w-full max-w-full sm:max-w-xl">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white ring-1 ring-white/15">
                            <CircleCheck className="h-4 w-4 text-white/90" />
                            {s.badge}
                          </div>
                          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                            {s.title}
                          </h1>
                          <p className="mt-2 text-sm font-semibold text-white/85 sm:text-base">
                            {s.subtitle}
                          </p>
                          <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                            <Button
                              className="h-11 w-full rounded-full bg-white px-6 font-extrabold text-[#0b4a90] hover:bg-white/90 sm:w-auto"
                              onClick={() => onNavigate('loan-application')}
                            >
                              {t('home.applyLoan')}
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-11 w-full rounded-full px-6 font-extrabold text-white hover:bg-white/10 sm:w-auto"
                              onClick={() => onNavigate('auth')}
                            >
                              {t('home.signIn')}
                            </Button>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                            <ShieldCheck className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2">
                        {slides.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              activeSlide === i ? 'bg-red-500' : 'bg-white/50 hover:bg-white/70'
                            }`}
                            aria-label={`Slide ${i + 1}`}
                            onClick={() => setActiveSlide(i)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-4 py-5 sm:grid-cols-4 sm:gap-6 sm:py-8">
            <button
              type="button"
              className="group flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => onNavigate('offers')}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eaf2ff] to-white text-[#0b4a90] ring-1 ring-[#0b4a90]/10">
                <Sparkles className="h-6 w-6" />
              </span>
              <span className="text-left">
                <div className="text-sm font-extrabold text-slate-900">{t('home.cards.offers.title')}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">{t('home.cards.offers.subtitle')}</div>
              </span>
            </button>
            <button
              type="button"
              className="group flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => onNavigate('exchange-rates')}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eaf2ff] to-white text-[#0b4a90] ring-1 ring-[#0b4a90]/10">
                <TrendingUp className="h-6 w-6" />
              </span>
              <span className="text-left">
                <div className="text-sm font-extrabold text-slate-900">{t('home.cards.exchange.title')}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">{t('home.cards.exchange.subtitle')}</div>
              </span>
            </button>
            <button
              type="button"
              className="group flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => onNavigate('deposit-rates')}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eaf2ff] to-white text-[#0b4a90] ring-1 ring-[#0b4a90]/10">
                <PiggyBank className="h-6 w-6" />
              </span>
              <span className="text-left">
                <div className="text-sm font-extrabold text-slate-900">{t('home.cards.deposit.title')}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">{t('home.cards.deposit.subtitle')}</div>
              </span>
            </button>

            <button
              type="button"
              className="group flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => onNavigate('live-chat')}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eaf2ff] to-white text-[#0b4a90] ring-1 ring-[#0b4a90]/10">
                <Headset className="h-6 w-6" />
              </span>
              <span className="text-left">
                <div className="text-sm font-extrabold text-slate-900">{t('home.cards.support.title')}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">{t('home.cards.support.subtitle')}</div>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1100px] px-4 py-8 sm:py-12">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t('home.personalLoan.title')}</h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            <div className="overflow-hidden rounded-2xl bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1600"
                alt=""
                className="h-56 w-full object-cover sm:h-72"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#0b4a90] sm:text-xl">{t('home.personalLoan.headline')}</h3>
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                {t('home.personalLoan.body')}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b4a90] hover:underline"
                onClick={() => onNavigate('loan-application')}
              >
                {t('home.applyLoan')} <ChevronRight className="h-4 w-4" />
              </button>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">{t('home.personalLoan.aprLabel')}</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">{t('home.personalLoan.aprValue')}</div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">{t('home.personalLoan.amountLabel')}</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">
                    {t('home.personalLoan.amountValue', { amount: formatCompactMoney(100000, showCurrencySign, currencySymbol) })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7fafc]">
        <div className="mx-auto max-w-[1100px] px-4 py-10 sm:py-14">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: t('home.features.1.title'), desc: t('home.features.1.desc') },
              { icon: TrendingUp, title: t('home.features.2.title'), desc: t('home.features.2.desc') },
              { icon: Percent, title: t('home.features.3.title'), desc: t('home.features.3.desc') },
              { icon: PhoneCall, title: t('home.features.4.title'), desc: t('home.features.4.desc') },
            ].map((x) => {
              const Icon = x.icon;
              return (
                <div key={x.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0b4a90] ring-1 ring-[#0b4a90]/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-3 text-sm font-extrabold text-slate-900">{x.title}</div>
                  <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">{x.desc}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-3">
              <h3 className="text-lg font-extrabold text-[#0b4a90] sm:text-xl">
                {t('home.lookup.title')}
              </h3>
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                {t('home.lookup.body')}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b4a90] hover:underline"
                onClick={() => onNavigate('auth')}
              >
                {t('home.lookup.cta')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <img
                src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1600"
                alt=""
                className="h-56 w-full object-cover sm:h-64"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b4a90]">
        <div className="mx-auto max-w-[1100px] px-4 py-10 sm:py-14">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/15">
            <div className="grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-3 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-white/15">
                  <Percent className="h-4 w-4" />
                  {t('home.mobile.badge')}
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('home.mobile.title')}</h3>
                <p className="text-sm leading-6 text-white/80 sm:text-base">
                  {t('home.mobile.body')}
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="h-11 rounded-full bg-white px-6 font-bold text-[#0b4a90] hover:bg-white/90"
                    onClick={() => onNavigate('loan-application')}
                  >
                    {t('home.mobile.applyNow')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 rounded-full px-6 font-bold text-white hover:bg-white/10"
                    onClick={() => onNavigate('auth')}
                  >
                    {t('home.signIn')}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -left-10 -bottom-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200"
                    alt=""
                    className="h-64 w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0a3f7b]">
        <div className="mx-auto max-w-[1100px] px-4 py-10 sm:py-12">
          <div className="grid grid-cols-1 gap-6 rounded-3xl bg-white/10 p-6 ring-1 ring-white/15 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div className="text-white">
              <h3 className="text-xl font-extrabold sm:text-2xl">{t('home.subscribe.title')}</h3>
              <p className="mt-2 text-sm text-white/80">{t('home.subscribe.body')}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder={t('home.subscribe.placeholder')}
                className="h-12 w-full rounded-full border-0 bg-white/95 px-5 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-white/40"
              />
              <Button className="h-12 rounded-full bg-[#0b4a90] px-6 font-bold text-white hover:bg-[#093b74]">
                {t('home.subscribe.button')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto max-w-[1100px] px-4 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">{t('home.footer.support')}</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-slate-900">
                    {t('home.footer.productsServices')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    {t('home.footer.tools')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    {t('home.footer.contact')}
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">{t('home.footer.followUs')}</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="rounded-2xl bg-[#f5f8ff] p-5 ring-1 ring-slate-200">
                <div className="text-sm font-extrabold text-[#0b4a90]">{t('home.footer.secureBanking')}</div>
                <p className="mt-1 text-sm text-slate-600">{t('home.footer.secureBankingBody')}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
            {t('home.footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}
