import React from 'react';
import { Store, ShieldCheck, WifiOff, CreditCard, ChevronRight, Barcode, TrendingUp, Sparkles, Smartphone } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-slate-900 dark:text-white">StockSawa</h1>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Retail Inventory</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onGetStarted}
            className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors"
          >
            Log in
          </button>
          <button 
            onClick={onGetStarted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Sign Up</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 sm:pb-24">
        <div className="relative bg-[#024126] rounded-[2rem] sm:rounded-[3rem] overflow-hidden flex flex-col md:flex-row items-center p-8 sm:p-12 lg:p-20 shadow-2xl">
          
          {/* Background Decorative Blobs */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[500px] h-[500px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[400px] h-[400px] bg-teal-500/20 blur-[80px] rounded-full pointer-events-none" />

          {/* Text Content */}
          <div className="relative z-10 w-full md:w-3/5 space-y-6 sm:space-y-8 text-center md:text-left">
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
              Manage your shop's inventory <span className="text-emerald-400">effortlessly.</span>
            </h2>
            <p className="text-emerald-50/80 text-lg sm:text-xl max-w-xl mx-auto md:mx-0 font-medium leading-relaxed">
              Powerful Point-of-Sale features, offline resilience, and automated audit trails—designed specifically for modern Kenyan retailers.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start pt-2">
              <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-[#024126] px-8 py-4 rounded-full text-base sm:text-lg font-black shadow-xl hover:shadow-2xl transition-all active:scale-95"
              >
                Start Using StockSawa
              </button>
              <p className="text-sm text-emerald-200/60 font-medium">No credit card required.</p>
            </div>
          </div>

          {/* Hero Graphics (Abstract POS representation) */}
          <div className="hidden md:flex relative z-10 w-2/5 justify-end mt-12 md:mt-0">
            <div className="relative w-full max-w-[400px] aspect-square">
              {/* Floating Cards */}
              <div className="absolute top-10 right-10 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl rotate-3 animate-[float_6s_ease-in-out_infinite]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Barcode className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full mb-2"></div>
                    <div className="h-3 w-24 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-20 -left-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl -rotate-6 animate-[float_5s_ease-in-out_infinite_reverse]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Daily Sales</div>
                    <div className="text-sm font-black text-emerald-600">KES 45,200</div>
                  </div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl shadow-2xl w-64 h-64 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-white/20 rounded-full"></div>
                  <div className="h-4 w-1/2 bg-white/20 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features / Why StockSawa Section */}
        <div className="mt-20 sm:mt-32">
          <div className="text-center mb-12 sm:mb-16 space-y-4">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Why StockSawa?
            </h3>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Everything you need to run your retail business smoothly, securely, and efficiently.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <FeatureCard 
              icon={<WifiOff className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
              title="Works Offline"
              desc="Internet down? No problem. Record sales and update inventory completely offline, and it syncs automatically when reconnected."
              colorClass="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800"
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
              title="Secure Audit Trails"
              desc="Prevent employee theft and shrinkage. Every deduction, sale, and update is permanently logged in a tamper-proof system."
              colorClass="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800"
            />
            <FeatureCard 
              icon={<CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
              title="Deni (Credit) Ledger"
              desc="Track customers who take items on credit. Manage their balances and record partial repayments effortlessly."
              colorClass="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
            />
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
              title="Camera Barcode Scanner"
              desc="Turn your mobile phone into a powerful barcode scanner. Instantly ring up items and speed up the checkout process."
              colorClass="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800"
            />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 sm:mt-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">Ready to upgrade your shop?</h3>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">Join smart retailers using StockSawa to protect their inventory and grow their profits.</p>
          <button 
            onClick={onGetStarted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full text-sm font-bold shadow-md transition-transform active:scale-95"
          >
            Create Your Free Account
          </button>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-700 dark:text-slate-300">StockSawa</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
          <p>Built for modern retail.</p>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-15px) rotate(calc(var(--tw-rotate) + 2deg)); }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, desc, colorClass }: { icon: React.ReactNode, title: string, desc: string, colorClass: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${colorClass}`}>
        {icon}
      </div>
      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
