import React, { useState } from 'react';
import { ShieldCheck, X, Check, FileText, Lock, Database, UserCheck, AlertCircle, ExternalLink } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree?: () => void;
  showAgreeButton?: boolean;
}

export default function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAgree,
  showAgreeButton = true,
}: PrivacyPolicyModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(() => {
    return localStorage.getItem('stocksawa_privacy_agreed') === 'true';
  });

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgreeClick = () => {
    localStorage.setItem('stocksawa_privacy_agreed', 'true');
    setHasAgreed(true);
    if (onAgree) onAgree();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.25s_ease-out]"
        role="dialog"
        aria-labelledby="privacy-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Privacy & Data Protection Policy
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Compliance with Kenya Data Protection Act (KDPA, 2019)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          onScroll={handleScroll}
          className="px-6 py-5 overflow-y-auto space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
        >
          {/* Quick Summary Pill */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-900 dark:text-emerald-300 mb-0.5">Your Business Data is Strictly Isolated & Protected</p>
              <p className="text-emerald-800/80 dark:text-emerald-400/90 leading-normal">
                StockSawa (stockify.co.ke) never sells your customer details, debts, inventory margins, or sales data to third parties or competitors.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              1. Information We Collect
            </h3>
            <p>To deliver inventory, sales tracking, and Deni management services, we store:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Account Credentials:</strong> Shop Name, email address, encrypted authentication tokens.</li>
              <li><strong>Inventory Data:</strong> Product titles, SKUs, barcode numbers, cost prices, selling prices, and quantities.</li>
              <li><strong>Sales & Audit Logs:</strong> Timestamped quantity deductions, cashier/staff PIN audit tags, and sale reasons.</li>
              <li><strong>Deni (Credit) Customer Information:</strong> Customer contact name, optional phone number, debt balance, and transaction history recorded by you.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              2. How Your Data Is Stored & Protected
            </h3>
            <p className="text-xs">
              StockSawa utilizes enterprise-grade <strong>Supabase Row-Level Security (RLS)</strong> with PostgreSQL. Every database table ensures that only your authenticated shop account (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">auth.uid() = user_id</code>) can read, insert, update, or delete your records.
            </p>
            <p className="text-xs">
              Offline data is stored locally in your browser's private sandboxed <strong>IndexedDB</strong> store, encrypted in transit using TLS 1.3 over HTTPS.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              3. Data Ownership & Customer Deni Confidentiality
            </h3>
            <p className="text-xs">
              You maintain 100% ownership over your business inventory and customer contacts. We do not use your customer numbers for marketing, unsolicited SMS broadcasts, or automated credit scoring. You retain the right to export or permanently wipe your inventory database at any time.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              4. Kenya Data Protection Act (2019) Compliance
            </h3>
            <p className="text-xs">
              In accordance with the Office of the Data Protection Commissioner (ODPC) of Kenya:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>You have the right to be informed about how customer data is processed.</li>
              <li>You have the right to rectify false or misleading customer or inventory records.</li>
              <li>You have the right to request full account deletion and erasure of cloud-stored records.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              5. Contact & Data Protection Officer
            </h3>
            <p className="text-xs">
              If you have inquiries regarding your store's privacy or need a full copy or wipe of your database records, contact support at{' '}
              <a href="mailto:support@stockify.co.ke" className="text-emerald-600 dark:text-emerald-400 font-bold underline">
                support@stockify.co.ke
              </a>.
            </p>
          </section>

          <p className="text-[11px] text-slate-400 italic pt-2">
            Last modified: October 2026. By using StockSawa (stockify.co.ke), you consent to the practices outlined above.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            {hasAgreed ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="w-4 h-4" /> You have agreed to this policy
              </span>
            ) : (
              <span>Please review the data protection terms above</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
            {showAgreeButton && (
              <button
                onClick={handleAgreeClick}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>I Understand & Agree</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
