import React, { useMemo } from 'react';
import { Product, InventoryTransaction, Customer } from '../types';
import { 
  AlertTriangle, Calendar, TrendingUp, Users, CalendarDays, BarChart3, Boxes, History
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  transactions: InventoryTransaction[];
  customers: Customer[];
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'credit' | 'profile' | 'activity') => void;
}

export default function DashboardView({ products, transactions, customers, setActiveTab }: DashboardViewProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    let salesToday = 0;
    let salesWeek = 0;
    let salesMonth = 0;
    let sales90Days = 0;

    transactions.forEach(tx => {
      if (tx.reasonCategory === 'Sale_Cash' || tx.reasonCategory === 'Sale_Mpesa') {
        // Need selling price... wait, transaction doesn't store price.
        // We have to look it up from products.
        // This is an approximation since price could have changed, but good enough for UI
        const product = products.find(p => p.id === tx.productId);
        const amount = Math.abs(tx.quantityChanged) * (product?.sellingPrice || 0);

        const txDate = new Date(tx.createdAt);
        
        if (txDate >= ninetyDaysAgo) {
          sales90Days += amount;
          if (txDate >= startOfMonth) salesMonth += amount;
          if (txDate >= startOfWeek) salesWeek += amount;
          if (txDate >= today) salesToday += amount;
        }
      }
    });

    return {
      salesToday,
      salesWeek,
      salesMonth,
      sales90Days
    };
  }, [transactions, products]);

  const recentActivity = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [transactions]);

  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + c.debtBalance, 0), [customers]);

  const lowStockProducts = products.filter(p => p.quantity <= 15 && p.quantity > 0);
  const outOfStockProducts = products.filter(p => p.quantity === 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount);
  };

  const getDaysAgo = (dateStr: string) => {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 3600 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="space-y-1 px-2 sm:px-0">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome, Brian</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Here's your store overview</p>
      </div>

      {/* SALES ACTIVITY */}
      <div className="space-y-3 px-2 sm:px-0">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Sales Activity</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-emerald-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Today</p>
            <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight">{formatCurrency(stats.salesToday)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">This Week</p>
            <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight">{formatCurrency(stats.salesWeek)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">This Month</p>
            <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight">{formatCurrency(stats.salesMonth)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Past 90 Days</p>
            <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight">{formatCurrency(stats.sales90Days)}</p>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="space-y-3 px-2 sm:px-0">
        <div className="flex items-center justify-between pl-1 pr-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recent Activity</h3>
          <button 
            onClick={() => setActiveTab('activity')}
            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            VIEW ALL ACTIVITY
          </button>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.map(tx => {
                const product = products.find(p => p.id === tx.productId);
                const isSale = tx.reasonCategory.startsWith('Sale');
                const isDeni = tx.reasonCategory === 'Deni';
                
                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer" onClick={() => setActiveTab('activity')}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSale ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 
                        isDeni ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {isSale ? <TrendingUp className="h-4 w-4" /> : isDeni ? <Users className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-[13px] leading-tight">
                          {product?.name || 'Unknown Product'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {tx.reasonCategory.replace('_', ' ')} • {getDaysAgo(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono text-sm ${tx.quantityChanged < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {tx.quantityChanged > 0 ? '+' : ''}{tx.quantityChanged}
                      </p>
                      {isSale && product && (
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatCurrency(Math.abs(tx.quantityChanged) * product.sellingPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 dark:text-slate-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">No activity yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* INVENTORY ALERTS */}
      <div className="space-y-3 px-2 sm:px-0">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Inventory Alerts</h3>
        
        <div className="space-y-3">
          {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) ? (
            <div 
              onClick={() => setActiveTab('inventory')}
              className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span className="font-bold text-slate-900 dark:text-rose-100 text-sm">
                  {outOfStockProducts.length > 0 
                    ? `${outOfStockProducts.length} Items Out of Stock` 
                    : `${lowStockProducts.length} Items Low on Stock`}
                </span>
              </div>
              <span className="text-rose-600 dark:text-rose-400 font-bold text-lg">&rsaquo;</span>
            </div>
          ) : (
             <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between opacity-70">
              <div className="flex items-center gap-3">
                <Boxes className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                <span className="font-bold text-slate-600 dark:text-slate-400 text-sm">All Stock Levels Good</span>
              </div>
            </div>
          )}

          <div 
            onClick={() => setActiveTab('inventory')}
            className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-amber-700 dark:text-amber-500" />
              <span className="font-bold text-slate-900 dark:text-amber-100 text-sm">Review Expiring Stock</span>
            </div>
            <span className="text-amber-700 dark:text-amber-500 font-bold text-lg">&rsaquo;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
