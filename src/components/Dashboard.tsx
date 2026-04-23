import { useState } from 'react';
import { 
  CreditCard, 
  Banknote, 
  Landmark, 
  ArrowRight,
  CheckCircle2,
  PiggyBank,
  Building2,
  LineChart,
  Home,
  Calculator,
  TrendingUp,
  Percent
} from 'lucide-react';
import { Button } from './ui/Button';
import { formatCompactMoney, formatMoney, useCurrency } from '../lib/currency';

interface DashboardProps {
  onNavigate: (view: 'loan-application') => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('INSURANCE');
  const { showCurrencySign } = useCurrency();

  const tabs = [
    'INSURANCE', 'CREDIT CARDS', 'MORTGAGES', 'PERSONAL LOANS', 
    'BUSINESS LOANS', 'FINANCIAL ADVISOR', 'INVESTING'
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Hero Section */}
      <section className="bg-[#004d2e] pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-white mb-16 tracking-tight">
            The Nerds can find your next financial product in minutes
          </h1>

          {/* Tabbed Interface Card */}
          <div className="max-w-6xl mx-auto relative px-4 z-10">
            <style>
              {`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
              `}
            </style>
            
            {/* Tabs */}
            <div className="flex items-end overflow-x-auto scrollbar-hide relative z-30 pl-0">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-6 py-4 text-[11px] sm:text-xs font-bold tracking-wider whitespace-nowrap transition-all rounded-t-xl mx-[1px]
                    ${activeTab === tab 
                      ? 'bg-white text-[#004d2e] pt-5 pb-5 -mb-[1px] shadow-[0_-2px_6px_rgba(0,0,0,0.05)] z-30' 
                      : 'bg-[#82e5b4] text-[#004d2e] hover:bg-[#9cf0c5] mb-1 py-3 opacity-95 z-10 shadow-inner'}
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="relative">
              {/* Stacked Bottom Layers */}
              <div className="absolute top-20 left-4 right-4 bottom-[-12px] bg-[#006048] rounded-3xl -z-20 opacity-40 transform scale-[0.99]"></div>
              <div className="absolute top-20 left-8 right-8 bottom-[-24px] bg-[#004d2e] rounded-3xl -z-30 opacity-20 transform scale-[0.97]"></div>

              <div className="bg-white rounded-b-3xl rounded-tr-3xl rounded-tl-none relative z-20 shadow-xl min-h-[480px]">
                <div className="p-8 md:p-14 h-full flex items-center">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
                    {/* Left Column: Text */}
                    <div className="max-w-xl">
                      {activeTab === 'INSURANCE' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-4 leading-[1.1] tracking-tight">
                            Find auto insurance at a price that works for you.
                          </h2>
                          <p className="text-lg text-[#004d2e] mb-10 font-medium">
                            Get matched with top providers in minutes.
                          </p>
                          <div className="max-w-md">
                            <label className="block text-xs font-bold text-[#004d2e] mb-2 uppercase tracking-wide">
                              Enter your ZIP code
                            </label>
                            <div className="flex shadow-sm h-[52px]">
                              <input 
                                type="text" 
                                placeholder="94103" 
                                className="w-40 px-4 h-full border border-gray-300 rounded-l-[4px] border-r-0 focus:outline-none focus:ring-1 focus:ring-[#004d2e] focus:border-[#004d2e] text-gray-900 bg-white placeholder-gray-400 text-lg font-medium"
                              />
                              <Button className="flex-1 bg-[#008060] hover:bg-[#006048] text-white font-bold text-sm px-6 h-full rounded-l-none rounded-r-[4px] uppercase tracking-wider transition-colors">
                                GET QUOTES
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'PERSONAL LOANS' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                            Our Nerds researched 35+ personal loan lenders so you don't have to.
                          </h2>
                          <Button 
                            onClick={() => onNavigate('loan-application')}
                            className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md"
                          >
                            FIND PERSONAL LOANS
                          </Button>
                        </div>
                      )}

                      {activeTab === 'CREDIT CARDS' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                            Our Nerds researched 400+ credit cards so you don't have to.
                          </h2>
                          <Button className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md">
                            FIND CREDIT CARDS
                          </Button>
                        </div>
                      )}

                      {activeTab === 'MORTGAGES' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                            Our Nerds researched 50+ mortgage lenders so you don't have to.
                          </h2>
                          <Button className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md">
                            FIND MORTGAGE RATES
                          </Button>
                        </div>
                      )}

                      {activeTab === 'BUSINESS LOANS' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                             Our Nerds researched 250+ small-business products so you don't have to.
                          </h2>
                          <Button className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md">
                             FIND BUSINESS LOANS
                          </Button>
                        </div>
                      )}

                      {activeTab === 'FINANCIAL ADVISOR' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                             Our Nerds make it easy to connect with the best financial advisors for your situation.
                          </h2>
                          <Button className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md">
                             FIND FINANCIAL ADVISORS
                          </Button>
                        </div>
                      )}

                      {activeTab === 'INVESTING' && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                            Our Nerds researched 60+ investment account providers so you don't have to.
                          </h2>
                          <Button className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md">
                            COMPARE ONLINE BROKERS
                          </Button>
                        </div>
                      )}

                      {!['INSURANCE', 'PERSONAL LOANS', 'CREDIT CARDS', 'MORTGAGES', 'BUSINESS LOANS', 'FINANCIAL ADVISOR', 'INVESTING'].includes(activeTab) && (
                        <div className="animate-fadeIn">
                          <h2 className="text-3xl md:text-[2.75rem] font-bold text-[#004d2e] mb-8 leading-[1.1] tracking-tight">
                            Find the best {activeTab.toLowerCase()} options.
                          </h2>
                          <Button className="bg-[#004d2e] hover:bg-[#003822] text-white font-bold text-sm px-8 py-4 h-[52px] rounded-[4px] uppercase tracking-wider transition-colors shadow-md">
                            Find {activeTab.toLowerCase()}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Image */}
                    <div className="relative h-full w-full hidden lg:block">
                       {/* Background Pattern for all tabs */}
                       <div className="absolute inset-0 bg-[#e6fcf0] rounded-2xl -z-10 overflow-hidden">
                          {/* Grid Pattern */}
                          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#004d2e 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.1 }}></div>
                          {/* Decorative elements */}
                          <div className="absolute top-10 right-10 w-24 h-24 bg-[#008060]/10 rounded-full blur-xl"></div>
                          <div className="absolute bottom-10 left-10 w-32 h-32 bg-[#86efac]/20 rounded-full blur-xl"></div>
                       </div>

                       {activeTab === 'INSURANCE' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                            <img 
                              src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=800" 
                              alt="Insurance Expert" 
                              className="h-[110%] w-auto object-contain mix-blend-multiply drop-shadow-xl"
                            />
                            {/* Floating Card */}
                            <div className="absolute top-10 right-0 bg-white p-4 rounded-lg shadow-lg rotate-3">
                               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle2 className="w-8 h-8 text-[#008060]" />
                               </div>
                            </div>
                          </div>
                       )}
                       
                       {activeTab === 'PERSONAL LOANS' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                             {/* Background Chart Element - Made larger and more professional */}
                             <div className="absolute top-6 left-4 w-64 h-48 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 p-6 transform -rotate-6 shadow-xl z-0 transition-transform hover:rotate-0 duration-500">
                                <div className="flex items-end justify-between h-full gap-3">
                                    <div className="w-full bg-green-200/80 h-[40%] rounded-t-md transition-all duration-1000 hover:h-[50%]"></div>
                                    <div className="w-full bg-green-300/80 h-[60%] rounded-t-md transition-all duration-1000 hover:h-[70%]"></div>
                                    <div className="w-full bg-green-400/80 h-[50%] rounded-t-md transition-all duration-1000 hover:h-[60%]"></div>
                                    <div className="w-full bg-[#004d2e] h-[85%] rounded-t-md shadow-lg transition-all duration-1000 hover:h-[95%]"></div>
                                </div>
                             </div>

                             <img 
                               src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&q=80&w=800" 
                               alt="Personal Loan Expert" 
                               className="h-[115%] w-auto object-contain mix-blend-multiply drop-shadow-2xl relative z-10 translate-x-8"
                             />
                             
                             {/* Floating Calculator Element - Made larger */}
                             <div className="absolute top-1/3 right-4 bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-bounce duration-[3000ms] z-20 rotate-6 border border-green-50/50">
                               <div className="flex flex-col items-center justify-center w-16 h-24 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                                  <div className="w-12 h-6 bg-[#004d2e] mb-2 rounded-[4px] flex items-center justify-center shadow-sm">
                                     <span className="text-[8px] text-white font-mono font-bold tracking-widest">NERD</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1">
                                     {[...Array(9)].map((_, i) => (
                                        <div key={i} className="w-2.5 h-2.5 bg-gray-200 rounded-[2px] hover:bg-green-200 transition-colors"></div>
                                     ))}
                                  </div>
                               </div>
                             </div>
                          </div>
                       )}

                       {activeTab === 'CREDIT CARDS' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                             <img 
                               src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800" 
                               alt="Credit Card Expert" 
                               className="h-[110%] w-auto object-contain mix-blend-multiply drop-shadow-xl"
                             />
                             {/* Floating Credit Card Element */}
                             <div className="absolute top-1/3 left-0 bg-white p-4 rounded-xl shadow-xl -rotate-6 animate-pulse duration-[4000ms]">
                               <div className="w-32 h-20 bg-gradient-to-r from-[#004d2e] to-[#008060] rounded-lg flex flex-col justify-end p-2 relative overflow-hidden">
                                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/20"></div>
                                  <div className="text-[8px] text-white/80 font-mono tracking-widest">•••• 4242</div>
                               </div>
                             </div>
                          </div>
                       )}

                       {activeTab === 'MORTGAGES' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                             <img 
                               src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800" 
                               alt="Mortgage Expert" 
                               className="h-[110%] w-auto object-contain mix-blend-multiply drop-shadow-xl"
                             />
                             {/* Floating House Element */}
                             <div className="absolute top-1/3 left-10 bg-white p-3 rounded-xl shadow-xl rotate-[-3deg] hover:rotate-0 transition-transform">
                               <Home className="w-12 h-12 text-[#004d2e]" />
                             </div>
                          </div>
                       )}

                       {activeTab === 'BUSINESS LOANS' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                             {/* Background Grid Element */}
                             <div className="absolute top-8 left-8 w-64 h-56 bg-[#e6f4ea] rounded-lg border-2 border-[#004d2e]/10 p-4 transform -rotate-3 z-0 overflow-hidden">
                                <div className="absolute inset-0 opacity-20" 
                                     style={{ backgroundImage: 'linear-gradient(#004d2e 1px, transparent 1px), linear-gradient(90deg, #004d2e 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                </div>
                             </div>

                             <img 
                               src="https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&q=80&w=800" 
                               alt="Business Loan Expert" 
                               className="h-[115%] w-auto object-contain mix-blend-multiply drop-shadow-2xl relative z-10"
                             />
                             
                             {/* Floating Cash Register (simplified) */}
                             <div className="absolute top-1/4 left-0 bg-white p-2 rounded-xl shadow-lg animate-bounce duration-[4000ms] z-20 -rotate-12 border border-green-50">
                                <div className="w-16 h-12 bg-green-100 rounded-lg flex items-center justify-center relative">
                                   <div className="w-12 h-8 bg-white border border-green-200 rounded flex flex-col items-center pt-1">
                                      <div className="w-10 h-3 bg-gray-100 mb-1"></div>
                                      <div className="grid grid-cols-3 gap-0.5">
                                         {[...Array(6)].map((_,i) => <div key={i} className="w-2 h-2 bg-gray-200 rounded-[1px]"></div>)}
                                      </div>
                                   </div>
                                   <div className="absolute -top-3 right-2 w-6 h-4 bg-white border border-green-200 rounded flex items-center justify-center text-[6px]">$</div>
                                </div>
                             </div>

                             {/* Floating Sticky Note */}
                             <div className="absolute top-1/3 right-4 bg-[#e8f5e9] p-4 w-32 h-32 rounded-sm shadow-md rotate-6 z-0">
                                <div className="w-8 h-2 bg-[#c8e6c9] absolute -top-1 left-1/2 -translate-x-1/2 rounded-full opacity-50 rotate-3"></div> {/* Tape/Clip */}
                                <div className="space-y-2 mt-2">
                                   <div className="h-2 bg-[#c8e6c9] rounded w-3/4"></div>
                                   <div className="h-2 bg-[#c8e6c9] rounded w-full"></div>
                                   <div className="h-2 bg-[#c8e6c9] rounded w-5/6"></div>
                                   <div className="h-2 bg-[#c8e6c9] rounded w-4/5"></div>
                                </div>
                             </div>
                          </div>
                       )}

                       {activeTab === 'FINANCIAL ADVISOR' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                             {/* Background Card Element */}
                             <div className="absolute top-4 left-10 w-64 h-64 bg-[#dcfce7] rounded-3xl transform rotate-3 z-0 shadow-inner overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#bbf7d0] rounded-bl-full opacity-50"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#bbf7d0] rounded-tr-full opacity-50"></div>
                             </div>

                             <img 
                               src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800" 
                               alt="Financial Advisor" 
                               className="h-[110%] w-auto object-contain mix-blend-multiply drop-shadow-2xl relative z-10 translate-x-4"
                             />
                             
                             {/* Floating Browser/Chart Window */}
                             <div className="absolute top-1/3 left-0 bg-white p-3 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-pulse z-20 -rotate-3 border border-green-50">
                                <div className="w-24 h-16 bg-gray-50 rounded border border-gray-100 flex flex-col p-1 gap-1">
                                   <div className="w-full h-2 bg-green-100 rounded-sm mb-1"></div>
                                   <div className="flex items-end justify-between h-full px-1 pb-1 gap-1">
                                      <div className="w-full bg-green-200 h-[30%] rounded-t-[1px]"></div>
                                      <div className="w-full bg-green-300 h-[50%] rounded-t-[1px]"></div>
                                      <div className="w-full bg-[#004d2e] h-[80%] rounded-t-[1px]"></div>
                                   </div>
                                </div>
                             </div>

                             {/* Floating Piggy Bank */}
                             <div className="absolute top-1/4 right-8 bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-xl animate-bounce duration-[3000ms] z-20 border border-green-100">
                                <div className="relative">
                                   <PiggyBank className="w-12 h-12 text-[#004d2e]" strokeWidth={1.5} />
                                   {/* Falling Coins */}
                                   <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col gap-1">
                                      <div className="w-2 h-2 rounded-full bg-yellow-400 border border-yellow-500 animate-ping"></div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}

                       {activeTab === 'INVESTING' && (
                          <div className="relative w-full aspect-[4/3] flex items-end justify-center animate-fadeIn">
                             {/* Background Chart Lines */}
                             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #004d2e 25%, #004d2e 26%, transparent 27%, transparent 74%, #004d2e 75%, #004d2e 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #004d2e 25%, #004d2e 26%, transparent 27%, transparent 74%, #004d2e 75%, #004d2e 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}></div>

                             <img 
                               src="https://images.unsplash.com/photo-1537511446984-935f663eb1f4?auto=format&fit=crop&q=80&w=800" 
                               alt="Investing Expert" 
                               className="h-[110%] w-auto object-contain mix-blend-multiply drop-shadow-2xl relative z-10"
                             />
                             
                             {/* Floating Sticky Note with Plant */}
                             <div className="absolute top-1/3 left-4 bg-[#f0fdf4] p-3 w-32 h-32 shadow-md -rotate-3 z-0">
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#86efac]/50 rotate-1"></div>
                                <div className="flex flex-col items-center justify-end h-full pb-2">
                                   <div className="flex items-end gap-1 mb-1">
                                      <div className="w-5 h-5 rounded-full bg-gray-300 border border-gray-400"></div>
                                      <div className="w-5 h-7 rounded-full bg-gray-300 border border-gray-400 -ml-2"></div>
                                      <div className="w-5 h-4 rounded-full bg-gray-300 border border-gray-400 -ml-2"></div>
                                   </div>
                                   <div className="w-1.5 h-10 bg-green-700 relative">
                                      <div className="absolute bottom-5 left-0 w-4 h-4 bg-green-500 rounded-tr-full rounded-bl-full rotate-45"></div>
                                      <div className="absolute bottom-8 right-0 w-3 h-3 bg-green-500 rounded-tl-full rounded-br-full -rotate-45"></div>
                                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-400 rounded-full"></div>
                                   </div>
                                </div>
                             </div>

                             {/* Floating Pie Chart */}
                             <div className="absolute top-1/4 right-8 bg-white p-3 rounded-lg shadow-lg rotate-6 z-0 animate-pulse duration-[5000ms]">
                                <div className="relative w-20 h-20 rounded-full border-[8px] border-green-50">
                                   <div className="absolute inset-0 border-[20px] border-[#004d2e] rounded-full" style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0, 100% 100%)' }}></div>
                                   <div className="absolute inset-0 border-[20px] border-[#4ade80] rounded-full" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }}></div>
                                </div>
                             </div>
                             
                             {/* Floating List/Menu Graphic */}
                             <div className="absolute top-1/2 right-0 translate-x-1/2 bg-white p-2 rounded shadow-md z-20">
                                <div className="w-16 space-y-1.5">
                                   <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                                   <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
                                   <div className="h-1.5 bg-gray-200 rounded w-5/6"></div>
                                </div>
                             </div>
                          </div>
                       )}

                       {!['INSURANCE', 'PERSONAL LOANS', 'CREDIT CARDS', 'MORTGAGES', 'BUSINESS LOANS', 'FINANCIAL ADVISOR', 'INVESTING'].includes(activeTab) && (
                          <div className="relative w-full aspect-[4/3] flex items-center justify-center animate-fadeIn">
                             <img 
                               src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800" 
                               alt="Finance" 
                               className="w-full h-full object-cover rounded-2xl shadow-lg"
                             />
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Picks / Comparison Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Compare top picks side-by-side</h2>
            <a href="#" className="text-[#008060] font-bold hover:underline flex items-center gap-1">
              View all categories <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Best Personal Loans Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Banknote className="w-6 h-6 text-[#008060]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Best Personal Loans</h3>
              <p className="text-gray-600 mb-6">Find low rates for debt consolidation, home improvement, and more.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> Rates from 6.99% APR
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> Loan amounts up to {formatCompactMoney(100000, showCurrencySign)}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> No prepayment penalties
                </li>
              </ul>
              <Button onClick={() => onNavigate('loan-application')} className="w-full bg-[#008060] hover:bg-[#004d2e] text-white font-bold h-12 rounded-[4px]">
                Compare Rates
              </Button>
            </div>

            {/* Best Credit Cards Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Best Credit Cards</h3>
              <p className="text-gray-600 mb-6">Earn cash back, travel rewards, or transfer balances to save on interest.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> 0% Intro APR offers
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> Up to 5% cash back
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> No annual fee options
                </li>
              </ul>
              <Button variant="outline" className="w-full border-[#008060] text-[#008060] hover:bg-green-50 font-bold h-12 rounded-[4px]">
                Find Your Card
              </Button>
            </div>

            {/* High Yield Savings Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <PiggyBank className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">High-Yield Savings</h3>
              <p className="text-gray-600 mb-6">Make your money work harder with high APY savings accounts.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> Earn up to 5.00% APY
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> FDIC Insured
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#008060]" /> No monthly fees
                </li>
              </ul>
              <Button variant="outline" className="w-full border-[#008060] text-[#008060] hover:bg-green-50 font-bold h-12 rounded-[4px]">
                Start Saving
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Vertical - Banking/Cash */}
      <section className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <div className="inline-block px-3 py-1 bg-green-100 text-[#008060] text-xs font-bold uppercase tracking-wider rounded-full mb-6">
                Banking
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-[#1a1f2c] mb-6">
                Maximize your cash with 4.60% APY
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Open a high-yield savings account today and start earning 10x the national average. No hidden fees, just growth.
              </p>
              <div className="flex gap-4">
                <Button className="h-14 px-8 text-lg font-bold bg-[#008060] hover:bg-[#004d2e] text-white rounded-[4px]">
                  Open Account
                </Button>
                <Button variant="ghost" className="h-14 px-8 text-lg font-bold text-[#1a1f2c] hover:bg-gray-100 rounded-[4px]">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="bg-gray-50 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Percent className="w-64 h-64 text-[#008060]" />
                </div>
                <div className="relative z-10 bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-auto transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#008060] rounded-full flex items-center justify-center">
                        <Landmark className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900">Savings Plus</span>
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Active</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-gray-500">Current Balance</span>
                    <div className="text-3xl font-bold text-gray-900">{formatMoney(24500, showCurrencySign, 2)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#008060] font-medium mb-6">
                    <TrendingUp className="w-4 h-4" /> +{formatMoney(145.2, showCurrencySign, 2)} this month
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#008060] w-[75%]" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Goal: Emergency Fund</span>
                      <span>75%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools & Calculators Strip */}
      <section className="py-20 bg-[#1a1f2c] text-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Financial Tools & Calculators</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Plan your future with our free financial tools.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <a href="#" className="flex flex-col items-center p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10 group">
              <Calculator className="w-8 h-8 text-[#008060] mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Mortgage Calculator</span>
            </a>
            <a href="#" className="flex flex-col items-center p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10 group">
              <LineChart className="w-8 h-8 text-[#008060] mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Retirement Planner</span>
            </a>
            <a href="#" className="flex flex-col items-center p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10 group">
              <CreditCard className="w-8 h-8 text-[#008060] mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Debt Payoff</span>
            </a>
            <a href="#" className="flex flex-col items-center p-6 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/10 group">
              <Building2 className="w-8 h-8 text-[#008060] mb-4 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Home Affordability</span>
            </a>
          </div>
        </div>
      </section>

      {/* Latest Advice / News */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Latest Financial Advice</h2>
            <a href="#" className="text-[#008060] font-bold hover:underline flex items-center gap-1">
              Read all articles <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <img src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800" alt="Money" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute bottom-4 left-4 bg-[#008060] text-white text-xs font-bold px-3 py-1 rounded-full">Investing</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#008060] transition-colors">7 Stocks to Buy Now for Long-Term Growth</h3>
                <p className="text-gray-600 text-sm mb-4">Our market analysts identify the top opportunities in the current economic landscape.</p>
                <span className="text-xs text-gray-400 font-medium">5 min read • By Sarah Jenkins</span>
              </div>
            </article>

            <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800" alt="House" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute bottom-4 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Mortgages</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#008060] transition-colors">Is Now the Right Time to Refinance?</h3>
                <p className="text-gray-600 text-sm mb-4">Interest rates are fluctuating. Here's what you need to know before making a move.</p>
                <span className="text-xs text-gray-400 font-medium">4 min read • By Michael Chang</span>
              </div>
            </article>

            <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800" alt="Credit Card" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute bottom-4 left-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">Credit Cards</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#008060] transition-colors">Best Travel Reward Cards for 2026</h3>
                <p className="text-gray-600 text-sm mb-4">Maximize your points and miles with these top-rated travel credit cards.</p>
                <span className="text-xs text-gray-400 font-medium">6 min read • By David Miller</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Why millions trust Upgrade</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-[#008060]">10M+</div>
              <p className="text-gray-600 font-medium text-lg">Financial decisions made</p>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-[#008060]">15k+</div>
              <p className="text-gray-600 font-medium text-lg">In-depth financial reviews</p>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-extrabold text-[#008060]">100+</div>
              <p className="text-gray-600 font-medium text-lg">Financial experts</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
