/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  History, Search, ShieldCheck, Download, AlertTriangle, 
  TrendingUp, ArrowDownRight, ArrowUpRight, HelpCircle, FileText
} from 'lucide-react';
import { InventoryTransaction, Product } from '../types';
import { getTransactions } from '../db/indexedDb';

interface AuditLogViewProps {
  products: Product[];
  transactions: InventoryTransaction[];
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'credit' | 'profile' | 'activity') => void;
}

export default function AuditLogView({ products, transactions, setActiveTab }: AuditLogViewProps) {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getProductName = (productId: string) => {
    const found = products.find(p => p.id === productId);
    return found ? found.name : 'Deleted/Unknown Product';
  };

  const getProductPrice = (productId: string) => {
    const found = products.find(p => p.id === productId);
    return found ? found.sellingPrice : 0;
  };

  const getProductCost = (productId: string) => {
    const found = products.find(p => p.id === productId);
    return found ? found.costPrice : 0;
  };

  // Filter logic
  const filteredTransactions = transactions.filter(tx => {
    const productName = getProductName(tx.productId).toLowerCase();
    const reasonCat = tx.reasonCategory.toLowerCase();
    const customReasonText = (tx.customReason || '').toLowerCase();
    
    const matchesSearch = productName.includes(searchQuery.toLowerCase()) || 
                          reasonCat.includes(searchQuery.toLowerCase()) ||
                          customReasonText.includes(searchQuery.toLowerCase());

    if (filterCategory === 'All') return matchesSearch;
    if (filterCategory === 'Sales') return matchesSearch && (tx.reasonCategory === 'Sale_Cash' || tx.reasonCategory === 'Sale_Mpesa');
    if (filterCategory === 'Shrinkage') return matchesSearch && (tx.reasonCategory === 'Expired' || tx.reasonCategory === 'Damaged' || tx.reasonCategory === 'Other');
    if (filterCategory === 'Debt') return matchesSearch && tx.reasonCategory === 'Deni';

    return matchesSearch;
  });

  const [selectedTx, setSelectedTx] = useState<InventoryTransaction | null>(null);

  // Financial Stats calculations
  let totalSalesVal = 0;
  let totalShrinkageVal = 0;
  let totalDeniVal = 0;

  transactions.forEach(tx => {
    const qty = Math.abs(tx.quantityChanged);
    const sPrice = getProductPrice(tx.productId);
    const cPrice = getProductCost(tx.productId);

    if (tx.reasonCategory === 'Sale_Cash' || tx.reasonCategory === 'Sale_Mpesa') {
      totalSalesVal += qty * sPrice;
    } else if (tx.reasonCategory === 'Expired' || tx.reasonCategory === 'Damaged' || tx.reasonCategory === 'Other') {
      // Shrinkage/writeoff represents cost price loss (loss in cost value of physical inventory)
      totalShrinkageVal += qty * cPrice;
    } else if (tx.reasonCategory === 'Deni') {
      totalDeniVal += qty * sPrice;
    }
  });

  return (
    <div id="audit-log-container" className="space-y-4 px-2 sm:px-0">
      
      {/* Financial KPIs widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Sales KPI */}
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm flex items-center gap-3.5 text-left transition-all cursor-pointer active:scale-[0.98] border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700`}
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Net Sales Revenue</span>
            <span id="stat-sales-revenue" className="text-base font-bold text-slate-900 dark:text-white font-mono block mt-0.5">KES {totalSalesVal}</span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-medium">Cash + M-Pesa sales</span>
          </div>
        </button>

        {/* Shrinkage/Loss KPI */}
        <button 
          onClick={() => {
            setFilterCategory('Shrinkage');
            setTimeout(() => {
              document.getElementById('audit-trail-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm flex items-center gap-3.5 text-left transition-all cursor-pointer active:scale-[0.98] border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700`}
        >
          <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-800">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Shrinkage Loss (Cost)</span>
            <span id="stat-shrinkage-loss" className="text-base font-bold text-rose-700 dark:text-rose-400 font-mono block mt-0.5">KES {totalShrinkageVal}</span>
            <span className="text-[9px] text-rose-500 dark:text-rose-400/80 block font-medium">Expired + Damaged + Other</span>
          </div>
        </button>

        {/* Credit Ledger KPI */}
        <button 
          onClick={() => setActiveTab('credit')}
          className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm flex items-center gap-3.5 text-left transition-all cursor-pointer active:scale-[0.98] border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700`}
        >
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Credit Issued (Debt)</span>
            <span id="stat-credit-issued" className="text-base font-bold text-amber-700 dark:text-amber-400 font-mono block mt-0.5">KES {totalDeniVal}</span>
            <span className="text-[9px] text-amber-600 dark:text-amber-400/80 block font-medium">Accumulated debtor take-outs</span>
          </div>
        </button>

      </div>

      {/* Main Audit Logs Section */}
      <div id="audit-trail-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide leading-none">Unalterable Audit Trail</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Compliance logging required for anti-theft accountability.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap sm:flex-nowrap w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50">
              {['All', 'Sales', 'Shrinkage', 'Debt'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`flex-1 sm:flex-none whitespace-nowrap px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter records by product, action, or custom reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-10 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Unalterable list */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredTransactions.map((tx) => {
            const isSale = tx.reasonCategory.startsWith('Sale');
            const isDeni = tx.reasonCategory === 'Deni';
            
            return (
              <button
                key={tx.id}
                id={`audit-log-${tx.id}`}
                onClick={() => setSelectedTx(tx)}
                className="w-full text-left p-3.5 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer active:scale-[0.99]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    
                    {/* Badge Category Tag */}
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                      isSale 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' 
                        : isDeni 
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50' 
                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50'
                    }`}>
                      {isDeni ? 'Debt' : tx.reasonCategory.replace('_', ' ')}
                    </span>

                    {/* Sync Badge */}
                    {tx.syncStatus === 'pending_sync' && (
                      <span className="text-[9px] bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-150 dark:border-sky-800 font-bold px-1.5 py-0.5 rounded">
                        Pending Sync
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {getProductName(tx.productId)}
                  </p>

                  {/* Custom specific reason if categorized as other */}
                  {tx.customReason && (
                    <p className="text-[10px] bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono italic max-w-xs mt-1">
                      Reason: "{tx.customReason}"
                    </p>
                  )}

                  {/* PIN accountability logger */}
                  {tx.staffPinUsed && (
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 mt-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Authorized with manager credentials: <strong className="text-slate-700 dark:text-slate-300">{tx.staffPinUsed}</strong></span>
                    </div>
                  )}
                </div>

                <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                    tx.quantityChanged < 0 
                      ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' 
                      : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                  }`}>
                    {tx.quantityChanged > 0 ? '+' : ''}{tx.quantityChanged} units
                  </span>
                  
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                    Valued: KES {Math.abs(tx.quantityChanged) * (tx.reasonCategory === 'Expired' || tx.reasonCategory === 'Damaged' || tx.reasonCategory === 'Other' ? getProductCost(tx.productId) : getProductPrice(tx.productId))}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-medium">
              No transactions matching the criteria found.
            </div>
          )}
        </div>

      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-[slideUp_0.3s_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Transaction Receipt
              </h3>
              <button 
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-center space-y-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">{getProductName(selectedTx.productId)}</div>
                <div className={`inline-flex items-center justify-center text-xs font-bold px-3 py-1 rounded-full border ${
                  selectedTx.quantityChanged < 0 
                    ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' 
                    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                }`}>
                  {selectedTx.quantityChanged > 0 ? 'Stock In: ' : 'Stock Out: '}
                  {Math.abs(selectedTx.quantityChanged)} units
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTx.id.substring(0, 8).toUpperCase()}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time</span>
                  <span className="font-bold text-slate-900 dark:text-white">{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTx.reasonCategory.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-3 mt-3">
                  <span className="text-slate-500">Total Value</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    KES {Math.abs(selectedTx.quantityChanged) * (['Expired', 'Damaged', 'Other'].includes(selectedTx.reasonCategory) ? getProductCost(selectedTx.productId) : getProductPrice(selectedTx.productId))}
                  </span>
                </div>
              </div>

              {(selectedTx.customReason || selectedTx.staffPinUsed) && (
                <div className="space-y-3">
                  {selectedTx.customReason && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-400">
                      <strong>Notes:</strong> {selectedTx.customReason}
                    </div>
                  )}
                  {selectedTx.staffPinUsed && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Authorized by Manager PIN: <strong>{selectedTx.staffPinUsed}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
