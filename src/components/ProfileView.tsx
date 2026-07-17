import React, { useState } from 'react';
import { Shield, ShieldCheck, User, Lock, RotateCcw, KeyRound, AlertCircle, CheckCircle2, Moon, Sun } from 'lucide-react';
import AuditLogView from './AuditLogView';
import { InventoryTransaction, Product } from '../types';

interface ProfileViewProps {
  userRole: 'admin' | 'employee';
  setUserRole: (role: 'admin' | 'employee') => void;
  adminPin: string | null;
  onSetAdminPin: (pin: string) => Promise<void>;
  theme: 'light' | 'dark';
  onSetTheme: (theme: 'light' | 'dark') => Promise<void>;
  handleResetDb: () => void;
  products: Product[];
  transactions: InventoryTransaction[];
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'credit' | 'profile' | 'activity') => void;
}

export default function ProfileView({ 
  userRole, 
  setUserRole, 
  adminPin, 
  onSetAdminPin, 
  theme,
  onSetTheme,
  handleResetDb, 
  products, 
  transactions, 
  setActiveTab 
}: ProfileViewProps) {
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSwitchToAdmin = () => {
    if (!adminPin) {
      setIsSettingPin(true);
      return;
    }
    setShowPinPrompt(true);
    setPinInput('');
    setPinError(null);
  };

  const handleVerifyPin = () => {
    if (pinInput === adminPin) {
      setUserRole('admin');
      setShowPinPrompt(false);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('Incorrect PIN. Access denied.');
    }
  };

  const handleCreatePin = async () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setPinError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    
    await onSetAdminPin(newPin);
    setShowSuccess(true);
    
    // Show success for 1.5s then switch role and close
    setTimeout(() => {
      setIsSettingPin(false);
      setShowSuccess(false);
      setUserRole('admin');
      setNewPin('');
      setConfirmPin('');
      setPinError(null);
    }, 1500);
  };
  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Your Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage access and review activity</p>
      </div>

      <div id="role-accountability-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Kiosk Access Accountability Control</span>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Active Role Mode:</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                userRole === 'admin' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' 
                  : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50'
              }`}>
                {userRole === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                <span className="uppercase tracking-wider">{userRole}</span>
              </span>
            </h2>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setUserRole('employee')}
              className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                userRole === 'employee' 
                  ? 'bg-white dark:bg-slate-700 text-indigo-900 dark:text-indigo-300 shadow-sm border border-slate-200 dark:border-slate-600' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Employee Mode</span>
            </button>
            
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                userRole === 'admin' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-900 dark:text-emerald-300 shadow-sm border border-slate-200 dark:border-slate-600' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Mode</span>
            </button>
          </div>
        </div>

        <div className="text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-150 dark:border-slate-800 flex items-start gap-3">
          <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 text-slate-400 mt-0.5 hidden sm:block">
            {userRole === 'admin' ? <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500 animate-pulse" /> : <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="sm:hidden">
                 {userRole === 'admin' ? <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500 animate-pulse" /> : <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
              </span>
              {userRole === 'admin' ? 'Administrative Privileges Active' : 'Restricted Employee Access'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {userRole === 'admin' 
                ? 'Full read/write permissions enabled. You can register new shelf products, modify existing prices/costs/barcodes, track debtors, and execute master resets of logs and inventory.' 
                : 'Restricted attendant privileges enabled. Authorized to perform stock checkout deduction transactions, search the catalogs, and view transaction history logs. Inventory editing is strictly disabled.'
              }
            </p>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <button
                onClick={handleResetDb}
                className="w-full sm:w-auto text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center justify-center sm:justify-start gap-2 transition cursor-pointer bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800/50 text-sm font-bold shadow-sm"
                title="Restores initial test products database"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restore Default Catalog</span>
              </button>
              
              <button
                onClick={() => setIsSettingPin(true)}
                className="w-full sm:w-auto text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center sm:justify-start gap-2 transition cursor-pointer bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold shadow-sm"
              >
                <KeyRound className="h-4 w-4" />
                <span>Change Admin PIN</span>
              </button>
          </div>
        )}
      </div>

      {/* Visual Theme Selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Display Preferences</span>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Visual Appearance</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSetTheme('light')}
            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
              theme === 'light' 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 ring-2 ring-indigo-500/10' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <Sun className={`h-5 w-5 ${theme === 'light' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
            <div className="text-left">
              <p className="text-xs font-bold">Light Mode</p>
              <p className="text-[10px] font-medium opacity-60">Clean & Bright</p>
            </div>
          </button>

          <button
            onClick={() => onSetTheme('dark')}
            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-900 dark:bg-slate-800 border-slate-800 dark:border-slate-700 text-white ring-2 ring-indigo-500/10 shadow-lg' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <Moon className={`h-5 w-5 ${theme === 'dark' ? 'text-indigo-400 dark:text-indigo-300' : ''}`} />
            <div className="text-left">
              <p className="text-xs font-bold">Night Mode</p>
              <p className="text-[10px] font-medium opacity-60">Deep & Focused</p>
            </div>
          </button>
        </div>
      </div>

      {/* PIN Setup/Entry Modal */}
      {(showPinPrompt || isSettingPin) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-[scaleIn_0.2s_ease-out] space-y-6">
            {showSuccess ? (
              <div className="text-center py-8 space-y-6 animate-[fadeIn_0.3s_ease-out]">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/20 rounded-full animate-ping opacity-25"></div>
                  <div className="relative w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-[scaleIn_0.4s_ease-out]">
                    <CheckCircle2 className="h-14 w-14" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pin successfully saved</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Your security access is now active</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isSettingPin ? (adminPin ? 'Change Admin PIN' : 'Set Admin PIN') : 'Admin Access Required'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isSettingPin 
                      ? 'Create a 4-digit security PIN to protect administrative features.' 
                      : 'Enter your 4-digit security PIN to unlock Admin Mode.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {isSettingPin ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">New 4-Digit PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          inputMode="numeric"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-center text-2xl tracking-[1em] font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Confirm PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          inputMode="numeric"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-center text-2xl tracking-[1em] font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Enter PIN</label>
                      <input
                        type="password"
                        autoFocus
                        maxLength={4}
                        inputMode="numeric"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                        placeholder="••••"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 text-center text-2xl tracking-[1em] font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  )}

                  {pinError && (
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 p-3 rounded-xl flex items-center gap-2.5 animate-[shake_0.4s_ease-in-out]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="text-[11px] font-bold">{pinError}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinPrompt(false);
                      setIsSettingPin(false);
                      setPinError(null);
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={isSettingPin ? handleCreatePin : handleVerifyPin}
                    disabled={isSettingPin ? (newPin.length !== 4 || confirmPin.length !== 4) : pinInput.length !== 4}
                    className="flex-1 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSettingPin ? <CheckCircle2 className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    <span>{isSettingPin ? 'Save PIN' : 'Unlock'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
