/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, UserPlus, Phone, CreditCard, ChevronRight, ArrowUpRight, 
  ArrowDownLeft, CheckCircle, RefreshCw, X, HelpCircle, ShoppingBag, Plus, AlertTriangle
} from 'lucide-react';
import { Customer, DeniTransaction, Product, InventoryTransaction } from '../types';
import { 
  getDeniTransactions, saveDeniTransaction, saveCustomer, getCustomers,
  saveProduct, saveTransaction 
} from '../db/indexedDb';

interface DeniLedgerViewProps {
  customers: Customer[];
  products: Product[];
  onRefreshCustomers: () => void;
  isOffline: boolean;
  showToast?: (msg: string) => void;
}

export default function DeniLedgerView({
  customers,
  products,
  onRefreshCustomers,
  isOffline,
  showToast
}: DeniLedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [deniTransactions, setDeniTransactions] = useState<DeniTransaction[]>([]);
  
  // Repay credit modal states
  const [showRepayModal, setShowRepayModal] = useState<boolean>(false);
  const [repaymentAmount, setRepaymentAmount] = useState<string>('');
  const [repaymentNotes, setRepaymentNotes] = useState<string>('');
  const [isSavingRepay, setIsSavingRepay] = useState<boolean>(false);
  const [showOverpayConfirm, setShowOverpayConfirm] = useState<boolean>(false);

  // Inline error for modals (no browser alert)
  const [localError, setLocalError] = useState<string | null>(null);
  const showErr = (msg: string) => {
    setLocalError(msg);
    setTimeout(() => setLocalError(null), 3500);
  };

  // New customer states
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');

  // For Quick Add Customer credit details
  const [recordCreditOnOnboard, setRecordCreditOnOnboard] = useState<boolean>(false);
  const [onboardSelectedProductId, setOnboardSelectedProductId] = useState<string>('custom');
  const [onboardCustomItemName, setOnboardCustomItemName] = useState<string>('');
  const [onboardQuantity, setOnboardQuantity] = useState<number>(1);
  const [onboardTotalCost, setOnboardTotalCost] = useState<string>('');

  // Record Credit for existing customer modal states
  const [showAddCreditModal, setShowAddCreditModal] = useState<boolean>(false);
  const [creditSelectedProductId, setCreditSelectedProductId] = useState<string>('custom');
  const [creditCustomItemName, setCreditCustomItemName] = useState<string>('');
  const [creditQuantity, setCreditQuantity] = useState<number>(1);
  const [creditTotalCost, setCreditTotalCost] = useState<string>('');
  const [isSavingCredit, setIsSavingCredit] = useState<boolean>(false);

  useEffect(() => {
    if (onboardSelectedProductId && onboardSelectedProductId !== 'custom') {
      const prod = products.find(p => p.id === onboardSelectedProductId);
      if (prod) {
        setOnboardTotalCost((prod.sellingPrice * onboardQuantity).toString());
      }
    }
  }, [onboardSelectedProductId, onboardQuantity, products]);

  useEffect(() => {
    if (creditSelectedProductId && creditSelectedProductId !== 'custom') {
      const prod = products.find(p => p.id === creditSelectedProductId);
      if (prod) {
        setCreditTotalCost((prod.sellingPrice * creditQuantity).toString());
      }
    }
  }, [creditSelectedProductId, creditQuantity, products]);

  useEffect(() => {
    loadDeniTransactions();
  }, [selectedCust]);

  const loadDeniTransactions = async () => {
    try {
      const allTx = await getDeniTransactions();
      if (selectedCust) {
        // Filter transactions for specific customer
        const filtered = allTx.filter(tx => tx.customerId === selectedCust.id);
        setDeniTransactions(filtered);
      } else {
        setDeniTransactions(allTx);
      }
    } catch (err) {
      console.error('Error loading deni transactions', err);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    let initialDebt = 0;
    const timestamp = new Date().toISOString();
    const customerId = 'cust_' + Date.now();

    if (recordCreditOnOnboard) {
      const parsedCost = Number(onboardTotalCost);
      if (isNaN(parsedCost) || parsedCost < 0) {
        showErr('Please enter a valid cost amount.');
        return;
      }
      initialDebt = parsedCost;
    }

    const newCust: Customer = {
      id: customerId,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      debtBalance: initialDebt,
      createdAt: timestamp
    };

    try {
      await saveCustomer(newCust);

      if (recordCreditOnOnboard && initialDebt > 0) {
        let notesStr = '';
        let selectedProd: Product | undefined = undefined;

        if (onboardSelectedProductId !== 'custom') {
          selectedProd = products.find(p => p.id === onboardSelectedProductId);
        }

        if (selectedProd) {
          notesStr = `Took ${onboardQuantity}x ${selectedProd.name} on credit`;
          
          // 1. Update product shelf stock
          const updatedProduct: Product = {
            ...selectedProd,
            quantity: Math.max(0, selectedProd.quantity - onboardQuantity)
          };
          await saveProduct(updatedProduct);

          // 2. Record Inventory Transaction log
          const invTx: InventoryTransaction = {
            id: 'tx_' + Date.now(),
            productId: selectedProd.id,
            staffPinUsed: null,
            quantityChanged: -onboardQuantity,
            reasonCategory: 'Deni',
            customReason: null,
            createdAt: timestamp,
            syncStatus: isOffline ? 'pending_sync' : 'synced'
          };
          await saveTransaction(invTx);
        } else {
          const itemName = onboardCustomItemName.trim() || 'Custom Item';
          notesStr = `Took ${onboardQuantity}x ${itemName} on credit`;
        }

        // 3. Save Deni Transaction
        const deniTx: DeniTransaction = {
          id: 'deni_' + Date.now(),
          customerId: customerId,
          productId: selectedProd ? selectedProd.id : null,
          amount: initialDebt,
          type: 'credit',
          notes: notesStr,
          createdAt: timestamp,
          syncStatus: isOffline ? 'pending_sync' : 'synced'
        };
        await saveDeniTransaction(deniTx);
      }

      onRefreshCustomers();
      
      // Reset form states
      setNewCustName('');
      setNewCustPhone('');
      setRecordCreditOnOnboard(false);
      setOnboardSelectedProductId('custom');
      setOnboardCustomItemName('');
      setOnboardQuantity(1);
      setOnboardTotalCost('');
      setShowAddCustomer(false);
    } catch (err) {
      console.error(err);
      showErr('Failed to register customer and credit. Please try again.');
    }
  };

  const handleAddCreditToExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) return;

    const parsedCost = Number(creditTotalCost);
    if (isNaN(parsedCost) || parsedCost <= 0) {
      showErr('Please enter a valid credit/cost amount.');
      return;
    }

    setIsSavingCredit(true);
    try {
      const timestamp = new Date().toISOString();
      let notesStr = '';
      let selectedProd: Product | undefined = undefined;

      if (creditSelectedProductId !== 'custom') {
        selectedProd = products.find(p => p.id === creditSelectedProductId);
      }

      if (selectedProd) {
        notesStr = `Took ${creditQuantity}x ${selectedProd.name} on credit`;

        // 1. Update product shelf stock
        const updatedProduct: Product = {
          ...selectedProd,
          quantity: Math.max(0, selectedProd.quantity - creditQuantity)
        };
        await saveProduct(updatedProduct);

        // 2. Record Inventory Transaction log
        const invTx: InventoryTransaction = {
          id: 'tx_' + Date.now(),
          productId: selectedProd.id,
          staffPinUsed: null,
          quantityChanged: -creditQuantity,
          reasonCategory: 'Deni',
          customReason: null,
          createdAt: timestamp,
          syncStatus: isOffline ? 'pending_sync' : 'synced'
        };
        await saveTransaction(invTx);
      } else {
        const itemName = creditCustomItemName.trim() || 'Custom Item';
        notesStr = `Took ${creditQuantity}x ${itemName} on credit`;
      }

      // 3. Save Deni Transaction
      const deniTx: DeniTransaction = {
        id: 'deni_' + Date.now(),
        customerId: selectedCust.id,
        productId: selectedProd ? selectedProd.id : null,
        amount: parsedCost,
        type: 'credit',
        notes: notesStr,
        createdAt: timestamp,
        syncStatus: isOffline ? 'pending_sync' : 'synced'
      };
      await saveDeniTransaction(deniTx);

      // 4. Update Customer debt balance
      const updatedCust: Customer = {
        ...selectedCust,
        debtBalance: selectedCust.debtBalance + parsedCost
      };
      await saveCustomer(updatedCust);

      // Refresh data
      setSelectedCust(updatedCust);
      onRefreshCustomers();
      await loadDeniTransactions();

      // Reset form states
      setCreditSelectedProductId('custom');
      setCreditCustomItemName('');
      setCreditQuantity(1);
      setCreditTotalCost('');
      setShowAddCreditModal(false);
      
      if (showToast) showToast('Credit recorded successfully!');
    } catch (err) {
      console.error(err);
      showErr('Failed to record credit purchase.');
    } finally {
      setIsSavingCredit(false);
    }
  };

  const handleRepayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !repaymentAmount) return;

    const repayVal = Number(repaymentAmount);
    if (isNaN(repayVal) || repayVal <= 0) {
      showErr('Please enter a valid repayment amount.');
      return;
    }

    if (repayVal > selectedCust.debtBalance) {
      // Show custom in-UI confirmation instead of window.confirm (which crashes PWA)
      setShowOverpayConfirm(true);
      return;
    }

    await processRepayment(repayVal);
  };

  // Extracted repayment processor used by both normal + overpay confirm paths
  const processRepayment = async (repayVal: number) => {
    if (!selectedCust) return;
    setIsSavingRepay(true);
    try {
      const timestamp = new Date().toISOString();
      const transactionId = 'repay_' + Date.now();
      const repayTx: DeniTransaction = {
        id: transactionId,
        customerId: selectedCust.id,
        productId: null,
        amount: -repayVal,
        type: 'payment',
        notes: repaymentNotes.trim() || 'Credit Repayment Clear',
        createdAt: timestamp,
        syncStatus: isOffline ? 'pending_sync' : 'synced'
      };
      const updatedCust: Customer = {
        ...selectedCust,
        debtBalance: Math.max(0, selectedCust.debtBalance - repayVal)
      };
      await saveDeniTransaction(repayTx);
      await saveCustomer(updatedCust);
      setSelectedCust(updatedCust);
      onRefreshCustomers();
      await loadDeniTransactions();
      setRepaymentAmount('');
      setRepaymentNotes('');
      setShowRepayModal(false);
      setShowOverpayConfirm(false);
      if (showToast) showToast('Debt paid successfully!');
    } catch (err) {
      console.error(err);
      showErr('Repayment save failed. Please try again.');
    } finally {
      setIsSavingRepay(false);
    }
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return 'Repayment Clear';
    const found = products.find(p => p.id === productId);
    return found ? found.name : 'Unknown Product';
  };

  // Filter main customer list
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  // Total Outstanding debt KES
  const totalOutstandingDeni = customers.reduce((sum, c) => sum + c.debtBalance, 0);

  return (
    <div id="deni-ledger-container" className="space-y-4 px-2 sm:px-0">
      
      {/* Debt Summary Banner */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-2xl p-5 text-white shadow-md flex items-center justify-between border border-amber-400/20 dark:border-amber-500/20">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 dark:text-amber-100/80 block">Total Kiosk Debts Outstanding</span>
          <h4 id="total-debt-outstanding" className="text-3xl font-bold font-mono tracking-tight">KES {totalOutstandingDeni}</h4>
          <span className="text-[10px] text-amber-100/90 block font-medium">Active Debtors: {customers.filter(c => c.debtBalance > 0).length} customers</span>
        </div>
        <div className="h-12 w-12 rounded-xl bg-white/10 dark:bg-white/5 flex items-center justify-center border border-white/20 text-white shrink-0 shadow-inner">
          <CreditCard className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Customer Directory */}
        <div className={`md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-sm flex flex-col ${selectedCust ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Debtor Directory</h3>
            <button
              onClick={() => setShowAddCustomer(true)}
              id="ledger-add-customer-btn"
              className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer border border-amber-100/50 dark:border-amber-800/50"
            >
              <UserPlus className="h-3 w-3" />
              <span>+ Add Debtor</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search debtor name/phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-xs font-medium focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-amber-55 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Customer list */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 flex-1">
            {filteredCustomers.map(cust => (
              <button
                key={cust.id}
                onClick={() => setSelectedCust(cust)}
                id={`customer-row-${cust.id}`}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between active:scale-[0.99] cursor-pointer ${
                  selectedCust?.id === cust.id
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 shadow-sm'
                    : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="space-y-1 min-w-0 pr-2 flex-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">{cust.name}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5 text-amber-600 dark:text-amber-500 shrink-0" />
                    <span className="truncate">{cust.phone}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono block">
                      KES {cust.debtBalance}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">Balance</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs font-medium">
                No customer logs found.
              </div>
            )}
          </div>
        </div>

        {/* Selected Customer Debt Ledger Audit Details */}
        <div className={`md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col min-h-[380px] ${selectedCust ? 'flex' : 'hidden md:flex'}`}>
          {selectedCust ? (
            <div className="space-y-4 flex flex-col h-full flex-1">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setSelectedCust(null)}
                className="md:hidden px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 self-start transition active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700 mb-1"
              >
                <span>← Back to Directory</span>
              </button>

              {/* Customer summary header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-full lg:w-auto flex justify-between items-start lg:block gap-4">
                  <div>
                    <h3 id="selected-debtor-name" className="text-base font-bold text-slate-800 dark:text-white break-words">{selectedCust.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Phone: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedCust.phone}</strong></p>
                  </div>
                  
                  {/* Mobile balance */}
                  <div className="lg:hidden text-right shrink-0">
                    <span id="selected-debtor-balance-mobile" className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono">KES {selectedCust.debtBalance}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Unpaid Credit</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Desktop balance */}
                  <div className="hidden lg:block text-right mr-1.5 shrink-0">
                    <span id="selected-debtor-balance" className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono">KES {selectedCust.debtBalance}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider">Unpaid Credit</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowAddCreditModal(true);
                      setCreditSelectedProductId(products[0]?.id || 'custom');
                      setCreditCustomItemName('');
                      setCreditQuantity(1);
                      setCreditTotalCost(products[0] ? (products[0].sellingPrice * 1).toString() : '');
                    }}
                    id="record-credit-btn"
                    className="flex-1 lg:flex-none justify-center px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Record Credit</span>
                  </button>

                  {selectedCust.debtBalance > 0 && (
                    <button
                      onClick={() => setShowRepayModal(true)}
                      id="repay-credit-btn"
                      className="flex-1 lg:flex-none justify-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Receive Repayment
                    </button>
                  )}
                </div>
              </div>

              {/* Running debt transaction history list */}
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-3.5 tracking-wider">
                  Account Ledger Statement
                </span>

                <div className="space-y-2 overflow-y-auto max-h-[300px] flex-1 pr-1">
                  {deniTransactions.map(tx => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <div
                        key={tx.id}
                        className={`p-3.5 rounded-xl border flex justify-between items-center ${
                          isCredit 
                            ? 'border-amber-100 dark:border-amber-900/30 bg-amber-50/15 dark:bg-amber-900/10' 
                            : 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/15 dark:bg-emerald-900/10'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {isCredit ? (
                              <div className="h-5 w-5 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800 shrink-0">
                                <ArrowUpRight className="h-3 w-3" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 shrink-0">
                                <ArrowDownLeft className="h-3 w-3" />
                              </div>
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                              {isCredit ? 'Bought item on credit' : 'Received Repayment Clear'}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 pl-6.5 font-medium">
                            {isCredit ? `Stock: ${getProductName(tx.productId)}` : tx.notes}
                          </p>
                          
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 pl-6.5 block font-mono">
                            {new Date(tx.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                            isCredit 
                              ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' 
                              : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                          }`}>
                            {isCredit ? '+' : '-'} KES {Math.abs(tx.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {deniTransactions.length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center gap-2.5">
                      <CheckCircle className="h-8 w-8 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                      <span className="font-semibold text-slate-500 dark:text-slate-400">This customer's ledger has no active records. Account is fully settled!</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600 space-y-3.5">
              <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Select a Customer</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-normal">
                  Tap on a debtor from the directory column to view their active ledger bills, and record credit cash clearances.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* REPAYMENT RECORD DIALOG */}
      {showRepayModal && selectedCust && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleRepayDebt}
            id="repay-ledger-form"
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4.5 animate-[scaleIn_0.2s_ease-out]"
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Receive Debt Cash</h4>
              <button 
                type="button" 
                onClick={() => setShowRepayModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <div className="space-y-1 bg-amber-50/50 dark:bg-amber-900/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[9px] uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider">Target Customer</span>
              <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedCust.name}</p>
              <p className="text-[11px] text-amber-900/90 dark:text-amber-400/90 mt-0.5">
                Current outstanding unpaid credit: <strong className="font-mono font-bold">KES {selectedCust.debtBalance}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Amount Cleared (KES) *
              </label>
              <input
                type="number"
                required
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                id="repayment-amount-input"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g. 500"
                min="1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Repayment Description Notes
              </label>
              <textarea
                value={repaymentNotes}
                onChange={(e) => setRepaymentNotes(e.target.value)}
                id="repayment-notes-input"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[70px] focus:bg-white dark:focus:bg-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g. Cleared by cash on Friday morning"
              />
            </div>

            {/* Inline error display */}
            {localError && (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-3.5 py-2.5 rounded-xl text-xs font-semibold animate-[slideDown_0.2s_ease-out]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowRepayModal(false)}
                className="w-1/3 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-repayment-btn"
                disabled={isSavingRepay || !repaymentAmount}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {isSavingRepay ? 'Saving ledger...' : 'Submit Clearance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OVERPAY CONFIRMATION DIALOG */}
      {showOverpayConfirm && selectedCust && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Overpayment Detected</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Amount exceeds outstanding debt of <strong className="font-mono text-amber-700 dark:text-amber-400">KES {selectedCust.debtBalance}</strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The repayment amount is more than what the customer owes. Proceeding will clear their balance to <strong>KES 0</strong>. Do you want to continue?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowOverpayConfirm(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => processRepayment(Number(repaymentAmount))}
                disabled={isSavingRepay}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {isSavingRepay ? 'Saving...' : 'Yes, Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER IN LEDGER DIALOG */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddCustomer}
            id="modal-add-customer-form"
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4.5 animate-[scaleIn_0.2s_ease-out]"
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Onboard Customer (Debt)</h4>
              <button 
                type="button" 
                onClick={() => setShowAddCustomer(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                id="new-customer-name-input"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-amber-55 focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g. Mama Shiro"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, ''))}
                id="new-customer-phone-input"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-amber-55 focus:outline-none font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="e.g. 0712345678"
              />
            </div>

            {/* Record credit taken on onboard check */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recordCreditOnOnboard}
                  onChange={(e) => {
                    setRecordCreditOnOnboard(e.target.checked);
                    if (e.target.checked) {
                      setOnboardSelectedProductId(products[0]?.id || 'custom');
                      setOnboardQuantity(1);
                      setOnboardCustomItemName('');
                      if (products[0]) {
                        setOnboardTotalCost((products[0].sellingPrice * 1).toString());
                      } else {
                        setOnboardTotalCost('');
                      }
                    }
                  }}
                  id="record-credit-onboard-checkbox"
                  className="rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Record item taken on credit immediately?</span>
              </label>
            </div>

            {recordCreditOnOnboard && (
              <div className="bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200/70 dark:border-amber-800 space-y-3 animate-[fadeIn_0.15s_ease-out]">
                {/* Select product dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Product / Item Taken *
                  </label>
                  <select
                    value={onboardSelectedProductId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOnboardSelectedProductId(val);
                      if (val !== 'custom') {
                        const prod = products.find(p => p.id === val);
                        if (prod) {
                          setOnboardTotalCost((prod.sellingPrice * onboardQuantity).toString());
                        }
                      }
                    }}
                    id="onboard-product-select"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (KES {p.sellingPrice}) - Stock: {p.quantity}
                      </option>
                    ))}
                    <option value="custom">✍️ Custom / Other Item...</option>
                  </select>
                </div>

                {/* Custom Item Name text input */}
                {onboardSelectedProductId === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Custom Item Name *
                    </label>
                    <input
                      type="text"
                      required={recordCreditOnOnboard && onboardSelectedProductId === 'custom'}
                      value={onboardCustomItemName}
                      onChange={(e) => setOnboardCustomItemName(e.target.value)}
                      id="onboard-custom-item-name"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="e.g. 2 Liter Soda or Custom Services"
                    />
                  </div>
                )}

                {/* Quantity and Total cost side-by-side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required={recordCreditOnOnboard}
                      min="1"
                      value={onboardQuantity}
                      onChange={(e) => setOnboardQuantity(Math.max(1, Number(e.target.value)))}
                      id="onboard-quantity-input"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Total Cost (KES) *
                    </label>
                    <input
                      type="number"
                      required={recordCreditOnOnboard}
                      min="0"
                      value={onboardTotalCost}
                      onChange={(e) => setOnboardTotalCost(e.target.value)}
                      id="onboard-total-cost-input"
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono font-bold text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900"
                      placeholder="e.g. 350"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="w-1/3 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-modal-customer-btn"
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Register & Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RECORD CREDIT FOR EXISTING CUSTOMER DIALOG */}
      {showAddCreditModal && selectedCust && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddCreditToExisting}
            id="modal-add-credit-form"
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4.5 animate-[scaleIn_0.2s_ease-out]"
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Record Credit Purchase</h4>
              <button 
                type="button" 
                onClick={() => setShowAddCreditModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

            <div className="space-y-1 bg-amber-50/50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[9px] uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider">Debtor Customer</span>
              <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedCust.name}</p>
              <p className="text-[10px] text-amber-900/90 dark:text-amber-400/90 mt-0.5 font-medium">
                Current outstanding: <span className="font-mono font-bold">KES {selectedCust.debtBalance}</span>
              </p>
            </div>

            {/* Select product dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Product / Item Taken *
              </label>
              <select
                value={creditSelectedProductId}
                onChange={(e) => {
                  const val = e.target.value;
                  setCreditSelectedProductId(val);
                  if (val !== 'custom') {
                    const prod = products.find(p => p.id === val);
                    if (prod) {
                      setCreditTotalCost((prod.sellingPrice * creditQuantity).toString());
                    }
                  }
                }}
                id="credit-product-select"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (KES {p.sellingPrice}) - Stock: {p.quantity}
                  </option>
                ))}
                <option value="custom">✍️ Custom / Other Item...</option>
              </select>
            </div>

            {/* Custom Item Name text input */}
            {creditSelectedProductId === 'custom' && (
              <div className="space-y-1.5 animate-[fadeIn_0.15s_ease-out]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Custom Item Name *
                </label>
                <input
                  type="text"
                  required={creditSelectedProductId === 'custom'}
                  value={creditCustomItemName}
                  onChange={(e) => setCreditCustomItemName(e.target.value)}
                  id="credit-custom-item-name"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="e.g. 2 Liter Soda or Custom Services"
                />
              </div>
            )}

            {/* Quantity and Total cost side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={creditQuantity}
                  onChange={(e) => setCreditQuantity(Math.max(1, Number(e.target.value)))}
                  id="credit-quantity-input"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Total Cost (KES) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={creditTotalCost}
                  onChange={(e) => setCreditTotalCost(e.target.value)}
                  id="credit-total-cost-input"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono font-bold text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-900"
                  placeholder="e.g. 350"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCreditModal(false)}
                className="w-1/3 py-2.5 text-xs text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-credit-purchase-btn"
                disabled={isSavingCredit}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {isSavingCredit ? 'Recording...' : 'Record Credit'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
