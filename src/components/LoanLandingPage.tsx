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
  const slides = useMemo<Slide[]>(
    () => [
      {
        title: 'Digital Banking Solutions',
        subtitle: 'Fast loans. Secure banking. Simple experience.',
        badge: 'Secure & Trusted',
        image: heroImage,
      },
      {
        title: 'Loan Approval in Minutes',
        subtitle: 'Transparent terms, flexible repayment, professional support.',
        badge: 'Fast Processing',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1600',
      },
      {
        title: 'Manage Your Loan',
        subtitle: 'Track status, view contract, and withdraw when approved.',
        badge: 'Mobile Friendly',
        image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&q=80&w=1600',
      },
      {
        title: 'Exclusive Rates & Offers',
        subtitle: 'Get rate updates and new loan offers directly to your inbox.',
        badge: 'Better Rates',
        image: 'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&q=80&w=1600',
      },
    ],
    [],
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
                      <div className="flex items-end justify-between gap-4">
                        <div className="max-w-[18rem] sm:max-w-xl">
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
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                              className="h-11 rounded-full bg-white px-6 font-extrabold text-[#0b4a90] hover:bg-white/90"
                              onClick={() => onNavigate('loan-application')}
                            >
                              Apply Loan
                            </Button>
                            <Button
                              variant="ghost"
                              className="h-11 rounded-full px-6 font-extrabold text-white hover:bg-white/10"
                              onClick={() => onNavigate('auth')}
                            >
                              Sign In
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
                <div className="text-sm font-extrabold text-slate-900">Attractive Offers</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">New rates and promotions</div>
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
                <div className="text-sm font-extrabold text-slate-900">Exchange Rates</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">Daily market updates</div>
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
                <div className="text-sm font-extrabold text-slate-900">Deposit Rates</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">Secure savings options</div>
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
                <div className="text-sm font-extrabold text-slate-900">Customer Service</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500">WhatsApp • Telegram • Live Chat</div>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1100px] px-4 py-8 sm:py-12">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">PERSONAL LOAN</h2>
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
              <h3 className="text-lg font-bold text-[#0b4a90] sm:text-xl">Fast approval. Clear terms.</h3>
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                Apply for a personal loan with flexible repayment options. Get a quick decision, transparent fees,
                and a smooth digital application experience.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b4a90] hover:underline"
                onClick={() => onNavigate('loan-application')}
              >
                Apply Loan <ChevronRight className="h-4 w-4" />
              </button>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">APR</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">From 6.99%</div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Amount</div>
                  <div className="mt-1 text-lg font-extrabold text-slate-900">Up to $100k</div>
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
              { icon: ShieldCheck, title: 'Protected Data', desc: 'Modern security standards for your information.' },
              { icon: TrendingUp, title: 'Live Status', desc: 'Track application and loan status anytime.' },
              { icon: Percent, title: 'Transparent Rates', desc: 'Clear terms, no hidden surprises.' },
              { icon: PhoneCall, title: 'Customer Support', desc: 'Get OTP and support from customer service.' },
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
                Guarantee Commitment Information Lookup
              </h3>
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                Quickly look up guarantee information and commitment details for your application. Built for speed,
                accuracy, and security.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b4a90] hover:underline"
                onClick={() => onNavigate('auth')}
              >
                Sign in to continue <ChevronRight className="h-4 w-4" />
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
                  Better rates, better experience
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Our Loan App on Mobile Devices</h3>
                <p className="text-sm leading-6 text-white/80 sm:text-base">
                  Track applications, upload documents, and manage repayments from your phone—anytime, anywhere.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="h-11 rounded-full bg-white px-6 font-bold text-[#0b4a90] hover:bg-white/90"
                    onClick={() => onNavigate('loan-application')}
                  >
                    Apply Now
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 rounded-full px-6 font-bold text-white hover:bg-white/10"
                    onClick={() => onNavigate('auth')}
                  >
                    Sign In
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
              <h3 className="text-xl font-extrabold sm:text-2xl">Subscribe for Loan Offers & Updates</h3>
              <p className="mt-2 text-sm text-white/80">Get new loan offers, rate updates, and product announcements.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Your email..."
                className="h-12 w-full rounded-full border-0 bg-white/95 px-5 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-white/40"
              />
              <Button className="h-12 rounded-full bg-[#0b4a90] px-6 font-bold text-white hover:bg-[#093b74]">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto max-w-[1100px] px-4 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">Support</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Products & Services
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Tools
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">Follow Us</h4>
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
                <div className="text-sm font-extrabold text-[#0b4a90]">Secure Banking</div>
                <p className="mt-1 text-sm text-slate-600">Your data is protected with modern security standards.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
            © Copyright VersaBank
          </div>
        </div>
      </footer>
    </div>
  );
}
