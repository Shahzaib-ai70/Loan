import { type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from './ui/Button';
import { UpgradeLogo } from './ui/UpgradeLogo';

interface LayoutProps {
  children: ReactNode;
  onNavigate?: (
    view:
      | 'dashboard'
      | 'register'
      | 'loan-application'
      | 'application-status'
      | 'withdraw'
      | 'auth'
      | 'admin'
      | 'admin-edit'
      | 'profile'
      | 'my-information'
      | 'loan-contract'
      | 'offers'
      | 'exchange-rates'
      | 'deposit-rates'
      | 'live-chat'
  ) => void;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export function Layout({ children, onNavigate, hideHeader, hideFooter }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {!hideHeader && (
        <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate?.('dashboard')}>
              <UpgradeLogo className="h-8" />
            </div>

            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Credit cards
              </a>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Banking
              </a>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Home
              </a>
              <button
                onClick={() => onNavigate?.('loan-application')}
                className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors"
              >
                Loans
              </button>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Insurance
              </a>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Personal finance
              </a>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Investing
              </a>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Small business
              </a>
              <a href="#" className="text-gray-900 hover:text-gray-600 font-bold text-sm transition-colors">
                Taxes
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Search className="w-5 h-5 text-gray-900 cursor-pointer" />
              <Button
                onClick={() => onNavigate?.('auth')}
                variant="ghost"
                className="font-bold text-[#008060] hover:bg-green-50 px-4 uppercase text-sm"
              >
                Sign In
              </Button>
              <Button
                onClick={() => onNavigate?.('auth')}
                className="font-bold rounded-[4px] bg-[#008060] hover:bg-[#004d2e] text-white px-6 shadow-sm uppercase text-sm h-10"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow">
        {children}
      </main>

      {!hideFooter && (
        <footer className="bg-[#111] text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div>
                <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase mb-6">Products</h3>
                <ul className="space-y-4">
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Credit Cards
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Personal Loans
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Small Business
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Banking
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase mb-6">Company</h3>
                <ul className="space-y-4">
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Press
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Leadership
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase mb-6">Support</h3>
                <ul className="space-y-4">
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Contact Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Security
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase mb-6">Legal</h3>
                <ul className="space-y-4">
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Terms of Use
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-gray-300 hover:text-white font-medium">
                      Do Not Sell My Info
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-16 border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <UpgradeLogo className="h-6 text-white" />
              </div>
              <p className="text-sm text-gray-500">&copy; 2026 Upgrade, Inc. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
