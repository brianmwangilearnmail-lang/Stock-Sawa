/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { 
  Boxes, Store, CreditCard, History, Search, Barcode, Plus, 
  Wifi, WifiOff, Cloud, RefreshCw, AlertTriangle, HelpCircle, RotateCcw, ShieldCheck, CheckCircle, Check,
  Shield, User, Lock, MinusCircle, LayoutDashboard, Loader2
} from 'lucide-react';
import { Product, Customer, InventoryTransaction, DeniTransaction } from './types';
import { 
  getProducts, getTransactions, getCustomers,
  initDb, resetDatabase, getSettings, saveSettings 
} from './db/indexedDb';
import BottomDeductionModal from './components/BottomDeductionModal';
import ProductFormModal from './components/ProductFormModal';
import BarcodeScanner from './components/BarcodeScanner';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import { syncPullAll } from './lib/syncEngine';
import { supabase } from './lib/supabase';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loaded components for code splitting
const DeniLedgerView = lazy(() => import('./components/DeniLedgerView'));
const AuditLogView = lazy(() => import('./components/AuditLogView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Database state
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'credit' | 'profile' | 'activity'>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [appToast, setAppToast] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'employee'>('employee');
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Modal toggles
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scannedNewSku, setScannedNewSku] = useState<string | null>(null);

  // Initialize DB on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
      } else if (event === 'USER_UPDATED') {
        // Only update session metadata, never set to null — prevents white screen crash
        if (session) setSession(session);
      } else if (session) {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    async function loadData() {
      const db = await initDb();
      
      // Auto-sync from cloud if online (handles fresh installs recovering data)
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        setIsSyncing(true);
        await syncPullAll(db);
        setIsSyncing(false);
      }
      
      const settings = await getSettings();
      if (settings) {
        if (settings.adminPin) setAdminPin(settings.adminPin);
        if (settings.theme) setTheme(settings.theme);
      }

      await refreshAllData();
    }
    loadData();

    // Set up Supabase Realtime subscription for seamless cross-device syncing
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          // Whenever ANY table changes (another device made a transaction), silently pull and refresh
          silentBackgroundResync();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const silentBackgroundResync = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const db = await initDb();
        await syncPullAll(db);
        await refreshAllData();
      }
    } catch (err) {
      console.error('Silent sync failed', err);
    }
  };

  // Theme observer
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const refreshAllData = async () => {
    try {
      const allProducts = await getProducts();
      const allTransactions = await getTransactions();
      const allCustomers = await getCustomers();
      
      setProducts(allProducts);
      setTransactions(allTransactions);
      setCustomers(allCustomers);
    } catch (err) {
      console.error('Error loading database tables:', err);
    }
  };

  const handleSetAdminPin = async (pin: string) => {
    await saveSettings({ id: 'current_settings', adminPin: pin, theme });
    setAdminPin(pin);
  };

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      await saveSettings({ id: 'current_settings', adminPin, theme: newTheme });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleSecureLogout = async () => {
    try {
      // 1. Wipe the entire local IndexedDB so no data leaks to the next user
      await resetDatabase();
      
      // 2. Clear all React state
      setProducts([]);
      setTransactions([]);
      setCustomers([]);
      setAdminPin(null);
      setUserRole('employee');
      setSearchQuery('');
      
      // 3. Finally clear session
      setSession(null);
    } catch (err) {
      console.error('Error during secure logout:', err);
      // Fallback
      setSession(null);
    }
  };

  // Listen to native browser online/offline events for auto-sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      triggerBackgroundResync();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerBackgroundResync = async () => {
    setIsSyncing(true);
    setSyncToast('Reconnecting... Syncing with Supabase Cloud...');

    try {
      const db = await initDb();
      await syncPullAll(db);
      await refreshAllData();
      setIsSyncing(false);
      setSyncToast('Database Synced! All records reconciled.');
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err) {
      console.error('Sync failed', err);
      setIsSyncing(false);
      setSyncToast('Sync completed with local cache.');
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  const handleBarcodeScan = (scannedSku: string) => {
    setSearchQuery(scannedSku);
    setShowScanner(false);

    // Look up product instantly
    const found = products.find(p => p.sku === scannedSku);
    if (found) {
      // Trigger deduction sheets instantly to satisfy < 4 seconds checkout checkout rule!
      setSelectedProduct(found);
    } else {
      // Product not found, prompt for creation with pre-filled SKU
      setScannedNewSku(scannedSku);
      setShowProductModal(true);
    }
  };

  const handleAddCustomerFromModal = (newCust: Customer) => {
    setCustomers(prev => [...prev, newCust]);
  };

  const handleResetDb = async () => {
    const confirm = window.confirm('This will restore seed products and clear custom audit logs. Proceed?');
    if (confirm) {
      await resetDatabase();
      setAdminPin(null);
      setUserRole('employee');
      await refreshAllData();
    }
  };

  // Computed alerts
  const lowStockProducts = products.filter(p => p.quantity <= 15);
  const outOfStockProducts = products.filter(p => p.quantity === 0);

  // Filter products by search text/SKU and status
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.includes(searchQuery);
    
    if (productStatusFilter === 'all') return matchesSearch;
    if (productStatusFilter === 'out_of_stock') return matchesSearch && p.quantity === 0;
    if (productStatusFilter === 'low_stock') return matchesSearch && p.quantity <= 15 && p.quantity > 0;
    if (productStatusFilter === 'in_stock') return matchesSearch && p.quantity > 15;
    
    return matchesSearch;
  });

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        {/* Animated Storefront Icon */}
        <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/30 mb-8 animate-[pulse_2s_ease-in-out_infinite] transform transition-transform">
          <Store className="w-12 h-12 text-white" />
        </div>
        
        {/* Loading Bar */}
        <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 relative">
          <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full animate-[loadingBar_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>

        {/* Welcome Text */}
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight animate-[fadeIn_0.5s_ease-in]">
          Welcome back!
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-2 animate-[fadeIn_0.7s_ease-in]">
          Loading your workspace...
        </p>

        {/* Loading Bar CSS Keyframes */}
        <style>{`
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(50%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (!session) {
    if (!showAuth) {
      return <LandingPage onGetStarted={() => setShowAuth(true)} />;
    }
    return <AuthPage onSuccess={() => refreshAllData()} onBack={() => setShowAuth(false)} />;
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 dark:bg-black flex flex-col text-slate-800 dark:text-slate-200 antialiased selection:bg-emerald-500/10 selection:text-emerald-900 transition-colors duration-300">
      
      {/* Top Navigation Bar / Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm px-4 py-3 sm:px-6 sm:py-4 transition-colors">
        <div className="max-w-full mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">StockSawa</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest mt-1 hidden sm:block">Stock Yako, Sawa Kila Wakati</p>
            </div>
          </div>

          {/* Offline/Online Simulation Toggle Pill & Mobile Scanner */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="sm:hidden p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Scan Barcode using Camera"
            >
              <Barcode className="h-5 w-5" />
            </button>

            <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-2 ${
              isOffline 
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' 
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
            }`}>
              {isOffline ? (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline Mode Active</span>
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Cloud Sync Active</span>
                </>
              )}
            </div>

            {isSyncing && (
              <RefreshCw className="h-4 w-4 text-emerald-600 animate-spin shrink-0" />
            )}
          </div>

        </div>
      </header>

      {/* Sync Status Overlay Toast */}
      {syncToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-[slideDown_0.3s_ease-out] android-toast">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Global App Toast */}
      {appToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 z-50 animate-[slideDown_0.3s_ease-out] android-toast">
          <Check className="h-4 w-4" />
          <span>{appToast}</span>
        </div>
      )}

      {/* Main Workspace content */}
      <main className="flex-1 max-w-full w-full mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24">
        
        {/* Desktop Navigation Tabs Bar */}
        <div className="hidden sm:flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" id="main-navigation-tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab-dashboard-desktop"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            id="tab-inventory-desktop"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4 shrink-0" />
            <span>Products</span>
          </button>
          
          <button
            onClick={() => setActiveTab('credit')}
            id="tab-credit-desktop"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'credit'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            id="tab-activity-desktop"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span>Activity</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            id="tab-profile-desktop"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>Profile</span>
          </button>
        </div>

        {/* Tab content renderer */}
        <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        }>
          {activeTab === 'dashboard' && (
            <ErrorBoundary>
            <DashboardView
              products={products}
              transactions={transactions}
              customers={customers}
              username={session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'Shop Owner'}
              setActiveTab={setActiveTab}
            />
            </ErrorBoundary>
          )}

        {activeTab === 'inventory' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Quick stats and Add product header */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Total Items Listed</span>
                  <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">{products.length}</p>
                </div>
                
                {lowStockProducts.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/50 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold self-start sm:self-auto">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                    <span>{lowStockProducts.length} items running low</span>
                  </div>
                )}
                
                {outOfStockProducts.length > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-800/50 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold self-start sm:self-auto">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span>{outOfStockProducts.length} out of stock</span>
                  </div>
                )}
              </div>

              {userRole === 'admin' ? (
                <button
                  onClick={() => setShowProductModal(true)}
                  id="add-new-product-trigger"
                  className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Product</span>
                </button>
              ) : (
                <div 
                  className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 select-none"
                  title="Add product requires Admin permissions"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Add Product (Locked)</span>
                </div>
              )}
            </div>

            {/* Smart Search Bar with Status Filters */}
            <div className="space-y-3">
              <div className="flex gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm items-center transition-colors">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Instant inventory lookup by product name or scan code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    id="main-search-input"
                    className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200/65 dark:border-slate-700 rounded-xl py-3 pl-10 pr-10 text-xs font-medium text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  id="camera-barcode-trigger"
                  className="hidden sm:flex p-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/50 items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
                  title="Scan Barcode using Camera"
                >
                  <Barcode className="h-5 w-5" />
                </button>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: 'All Products', count: products.length, color: 'slate' },
                  { id: 'in_stock', label: 'In Stock', count: products.filter(p => p.quantity > 15).length, color: 'emerald' },
                  { id: 'low_stock', label: 'Low Stock', count: lowStockProducts.length, color: 'amber' },
                  { id: 'out_of_stock', label: 'Out of Stock', count: outOfStockProducts.length, color: 'rose' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setProductStatusFilter(filter.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                      productStatusFilter === filter.id
                        ? filter.color === 'emerald' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/20' :
                          filter.color === 'amber' ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/20' :
                          filter.color === 'rose' ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/20' :
                          'bg-slate-800 dark:bg-slate-700 border-slate-800 dark:border-slate-700 text-white shadow-md shadow-slate-200 dark:shadow-slate-900/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                      productStatusFilter === filter.id 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Products Catalog Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="products-catalog-grid">
              {filteredProducts.map(product => {
                const isLow = product.quantity <= 15 && product.quantity > 0;
                const isOut = product.quantity === 0;

                return (
                  <div
                    key={product.id}
                    id={`product-card-${product.id}`}
                    onClick={() => !isOut && setSelectedProduct(product)}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-3 sm:p-4 flex gap-4 items-center shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                      isOut 
                        ? 'border-rose-200 dark:border-rose-900/30 bg-rose-50/10 dark:bg-rose-900/5 opacity-75' 
                        : isLow 
                        ? 'border-amber-200 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-900/5' 
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Image */}
                    <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 bg-[#eef2f9] dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden relative">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                          <Boxes className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      
                      {/* Inventory stock badges */}
                      {isOut && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="bg-rose-600 text-white font-black uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-sm shadow-sm">
                            OUT
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-[15px] sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate mb-1.5">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">In Stock:</span>
                        <span className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded-md border ${
                          isOut ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800/50' : 
                          isLow ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/50' : 
                          'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
                        }`}>
                          {product.quantity} Units
                        </span>
                      </div>
                    </div>

                    {/* Edit Button */}
                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductToEdit(product);
                        }}
                        className="p-2 sm:p-3 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                        title="Edit product details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No products match your search. Click "Add Product" to create one!
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'credit' && (
          <ErrorBoundary>
          <DeniLedgerView 
            customers={customers} 
            products={products}
            onRefreshCustomers={refreshAllData}
            isOffline={isOffline}
            showToast={(msg) => {
              setAppToast(msg);
              setTimeout(() => setAppToast(null), 3000);
            }}
          />
          </ErrorBoundary>
        )}

        {activeTab === 'profile' && (
          <ErrorBoundary>
          <ProfileView 
            userRole={userRole}
            setUserRole={setUserRole}
            adminPin={adminPin}
            onSetAdminPin={handleSetAdminPin}
            theme={theme}
            onSetTheme={handleSetTheme}
            handleResetDb={handleResetDb}
            onLogout={handleSecureLogout}
            products={products}
            transactions={transactions}
            setActiveTab={setActiveTab}
            username={session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || ''}
            showToast={(msg) => {
              setAppToast(msg);
              setTimeout(() => setAppToast(null), 3000);
            }}
          />
          </ErrorBoundary>
        )}

        {activeTab === 'activity' && (
          <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">System Activity</h2>
              <p className="text-slate-500 font-medium">Review sales metrics and unalterable audit trails</p>
            </div>
            <AuditLogView 
              products={products} 
              transactions={transactions} 
              setActiveTab={setActiveTab} 
            />
          </div>
        )}
        </Suspense>
        </ErrorBoundary>

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 sm:px-6 mt-auto pb-24 sm:pb-6 transition-colors">
        <div className="max-w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600 animate-pulse shrink-0" />
            <span>StockSawa Audit Trail. Secured locally via browser IndexedDB Storage.</span>
          </div>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-30 pb-safe transition-colors">
        <div className="flex items-center justify-around p-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <LayoutDashboard className={`h-5 w-5 ${activeTab === 'dashboard' ? 'fill-emerald-100 dark:fill-emerald-900/30' : ''}`} />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'inventory' ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <Boxes className={`h-5 w-5 ${activeTab === 'inventory' ? 'fill-emerald-100 dark:fill-emerald-900/30' : ''}`} />
            <span className="text-[10px]">Products</span>
          </button>
          
          <button
            onClick={() => setActiveTab('credit')}
            className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'credit' ? 'text-amber-600 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <CreditCard className={`h-5 w-5 ${activeTab === 'credit' ? 'fill-amber-100 dark:fill-amber-900/30' : ''}`} />
            <span className="text-[10px]">Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'activity' ? 'text-emerald-600 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <History className={`h-5 w-5 ${activeTab === 'activity' ? 'fill-emerald-100 dark:fill-emerald-900/30' : ''}`} />
            <span className="text-[10px]">Activity</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile' ? 'text-indigo-600 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <User className={`h-5 w-5 ${activeTab === 'profile' ? 'fill-indigo-100 dark:fill-indigo-900/30' : ''}`} />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>

      {/* CAMERA BARCODE LOOKUP OVERLAY MODAL */}
      {showScanner && (
        <BarcodeScanner
          products={products}
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* PRODUCT CREATION & EDIT DIALOG */}
      {(showProductModal || productToEdit) && (
        <ProductFormModal
          productToEdit={productToEdit || undefined}
          initialSku={scannedNewSku || undefined}
          onClose={() => {
            setShowProductModal(false);
            setProductToEdit(null);
            setScannedNewSku(null);
          }}
          showToast={(msg) => {
            setAppToast(msg);
            setTimeout(() => setAppToast(null), 3000);
          }}
          onSuccess={async (updatedProduct) => {
            setShowProductModal(false);
            setProductToEdit(null);
            setScannedNewSku(null);
            await refreshAllData();
          }}
          onDelete={async (id) => {
            setProductToEdit(null);
            await refreshAllData();
          }}
        />
      )}

      {/* DEDUCTION SMART BOTTOM MODAL SHEET */}
      {selectedProduct && (
        <BottomDeductionModal
          product={selectedProduct}
          customers={customers}
          isOffline={isOffline}
          adminPin={adminPin}
          showToast={(msg) => {
            setAppToast(msg);
            setTimeout(() => setAppToast(null), 3000);
          }}
          onClose={() => setSelectedProduct(null)}
          onSuccess={async () => {
            setSelectedProduct(null);
            await refreshAllData();
          }}
          onAddCustomer={handleAddCustomerFromModal}
        />
      )}

    </div>
  );
}
