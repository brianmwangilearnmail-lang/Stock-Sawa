/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Banknote, Smartphone, FileSpreadsheet, AlertTriangle, Trash2, 
  HelpCircle, UserPlus, Search, Check, AlertCircle, RefreshCw, Lock, ShieldAlert
} from 'lucide-react';
import { Product, Customer, ReasonCategory, InventoryTransaction, DeniTransaction } from '../types';
import { saveTransaction, saveCustomer, saveDeniTransaction, saveProduct } from '../db/indexedDb';

interface BottomDeductionModalProps {
  product: Product;
  customers: Customer[];
  onClose: () => void;
  onSuccess: () => void;
  onAddCustomer: (newCust: Customer) => void;
  isOffline: boolean;
  adminPin: string | null;
  showToast?: (msg: string) => void;
}

export default function BottomDeductionModal({
  product,
  customers,
  onClose,
  onSuccess,
  onAddCustomer,
  isOffline,
  adminPin,
  showToast
}: BottomDeductionModalProps) {
  // Modal states
  const [selectedReason, setSelectedReason] = useState<ReasonCategory>('Sale_Cash');
  const [quantity, setQuantity] = useState<number>(1);
  const [customReason, setCustomReason] = useState<string>('');
  
  // M-Pesa states
  const [mpesaPhone, setMpesaPhone] = useState<string>('');
  const [stkPushState, setStkPushState] = useState<'idle' | 'pushing' | 'awaiting_callback' | 'success' | 'failed'>('idle');
  const [showMpesaSandbox, setShowMpesaSandbox] = useState<boolean>(false);

  // Deni states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [customerSearchFocused, setCustomerSearchFocused] = useState<boolean>(false);

  // Quick-PIN Verification states
  const [showPinOverlay, setShowPinOverlay] = useState<boolean>(false);
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Submission loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Increment/Decrement helper
  const adjustQuantity = (amount: number) => {
    const newQty = Math.max(1, Math.min(product.quantity, quantity + amount));
    setQuantity(newQty);
  };

  // Autocomplete Customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  // Handle Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;

    const newCust: Customer = {
      id: 'cust_' + Date.now(),
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      debtBalance: 0,
      createdAt: new Date().toISOString()
    };

    await saveCustomer(newCust);
    onAddCustomer(newCust);
    setSelectedCustomer(newCust);
    setSearchQuery(newCust.name);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setShowAddCustomer(false);
  };

  // Submit trigger - decides whether pin is needed
  const handleSubmitTrigger = () => {
    // Validation first
    if (quantity > product.quantity) {
      alert('Cannot deduct more than available shelf stock!');
      return;
    }

    if (selectedReason === 'Other' && customReason.trim().length < 5) {
      return; // Submit button disabled by condition
    }

    if (selectedReason === 'Sale_Mpesa') {
      if (!/^0(7|1)\d{8}$/.test(mpesaPhone)) {
        alert('Please enter a valid Kenyan Safaricom Number (e.g. 0712345678)');
        return;
      }
      initiateMpesaPush();
      return;
    }

    if (selectedReason === 'Deni' && !selectedCustomer) {
      alert('Please select or add a customer to log debt against!');
      return;
    }

    // PIN check for Expired, Damaged, Other
    const needsPin = ['Expired', 'Damaged', 'Other'].includes(selectedReason);
    if (needsPin) {
      setShowPinOverlay(true);
      setPinCode('');
      setPinError(null);
    } else {
      processDeduction(null);
    }
  };

  // Pin button clicks
  const handlePinKeyPress = (char: string) => {
    setPinError(null);
    if (char === 'clear') {
      setPinCode('');
    } else if (char === 'back') {
      setPinCode(prev => prev.slice(0, -1));
    } else {
      if (pinCode.length < 4) {
        const newPin = pinCode + char;
        setPinCode(newPin);
        
        // Auto-submit PIN once it reaches 4 digits
        if (newPin.length === 4) {
          verifyPinAndSubmit(newPin);
        }
      }
    }
  };

  // Verify PIN
  const verifyPinAndSubmit = (enteredPin: string) => {
    if (adminPin && enteredPin === adminPin) {
      setShowPinOverlay(false);
      processDeduction('Admin PIN Confirmed');
    } else {
      setPinCode('');
      setPinError('Invalid PIN! Please input the correct Admin PIN.');
    }
  };

  // Core Deduction Processing
  const processDeduction = async (authorizedBy: string | null) => {
    setIsSubmitting(true);
    try {
      const transactionId = 'tx_' + Date.now();
      const timestamp = new Date().toISOString();

      // 1. Create inventory transaction log
      const txLog: InventoryTransaction = {
        id: transactionId,
        productId: product.id,
        staffPinUsed: authorizedBy,
        quantityChanged: -quantity,
        reasonCategory: selectedReason,
        customReason: selectedReason === 'Other' ? customReason.trim() : null,
        createdAt: timestamp,
        syncStatus: isOffline ? 'pending_sync' : 'synced'
      };

      // 2. Subtract stock from product
      const updatedProduct: Product = {
        ...product,
        quantity: product.quantity - quantity
      };

      // Save updated product
      await saveProduct(updatedProduct);

      // Save transaction
      await saveTransaction(txLog);

      // 3. Handle Deni customer credit ledger updates
      if (selectedReason === 'Deni' && selectedCustomer) {
        const debtAmount = product.sellingPrice * quantity;
        
        // Create credit transaction ledger item
        const deniTx: DeniTransaction = {
          id: 'deni_' + Date.now(),
          customerId: selectedCustomer.id,
          productId: product.id,
          amount: debtAmount,
          type: 'credit',
          notes: `Took ${quantity}x ${product.name} on credit`,
          createdAt: timestamp,
          syncStatus: isOffline ? 'pending_sync' : 'synced'
        };

        // Update running debt balance
        const updatedCustomer: Customer = {
          ...selectedCustomer,
          debtBalance: selectedCustomer.debtBalance + debtAmount
        };

        await saveDeniTransaction(deniTx);
        await saveCustomer(updatedCustomer);
      }

      setIsSubmitting(false);
      if (showToast) {
        showToast('Deduction successfully made!');
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error updating database stores');
      setIsSubmitting(false);
    }
  };

  // M-Pesa STK Push Trigger
  const initiateMpesaPush = () => {
    setStkPushState('pushing');
    
    // Simulate Daraja API STK Push transmission delay
    setTimeout(() => {
      setStkPushState('awaiting_callback');
      setShowMpesaSandbox(true);
    }, 1500);
  };

  // Sandbox callbacks
  const handleSandboxCallback = (success: boolean) => {
    setShowMpesaSandbox(false);
    if (success) {
      setStkPushState('success');
      // Wait a moment for success celebration and apply deduction
      setTimeout(() => {
        processDeduction('M-Pesa Verified');
      }, 1000);
    } else {
      setStkPushState('failed');
    }
  };

  return (
    <div id="bottom-sheet-backdrop" className="fixed inset-0 bg-slate-900/60 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dimmed touch closer */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Actual responsive bottom sheet sheet */}
      <div 
        id="bottom-deduction-sheet"
        className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border-t sm:border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-[slideUp_0.25s_ease-out]"
      >
        {/* Grab bar */}
        <div className="w-full flex justify-center py-2.5 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3.5 pt-1 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">Smart Shelf Reduction</span>
            <h3 id="sheet-product-name" className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 mt-0.5">{product.name}</h3>
          </div>
          <button 
            onClick={onClose}
            id="close-sheet-btn"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {/* Scrollable sheet contents */}
        <div className="overflow-y-auto px-5 py-4 flex-1 space-y-4 pb-12">
          
          {/* Quantity selector */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">Quantity to Deduct</span>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                On shelves: <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">{product.quantity} units</strong>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => adjustQuantity(-1)}
                id="qty-decrement-btn"
                className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 font-bold text-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                -
              </button>
              <span id="qty-value-display" className="text-xl font-bold text-slate-800 dark:text-white w-6 text-center font-mono">
                {quantity}
              </span>
              <button
                onClick={() => adjustQuantity(1)}
                id="qty-increment-btn"
                className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 font-bold text-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Large Interactive Category Action Blocks (Module 2, thumb zone optimized) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Deduction Category (Tap 1)
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" id="deduction-categories-grid">
              {[
                { id: 'Sale_Cash', label: 'Cash Sale', icon: Banknote, color: 'emerald', sub: 'KES ' + (product.sellingPrice * quantity).toLocaleString() },
                { id: 'Sale_Mpesa', label: 'M-Pesa', icon: Smartphone, color: 'emerald', sub: 'Coming Soon' },
                { id: 'Deni', label: 'Debt Credit', icon: FileSpreadsheet, color: 'amber', sub: 'Ledger' },
                { id: 'Expired', label: 'Expired', icon: AlertTriangle, color: 'orange', sub: 'PIN REQD' },
                { id: 'Damaged', label: 'Damaged', icon: Trash2, color: 'rose', sub: 'PIN REQD' },
                { id: 'Other', label: 'Other', icon: HelpCircle, color: 'slate', sub: 'CUSTOM' },
              ].map((reason) => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => { setSelectedReason(reason.id as any); setStkPushState('idle'); }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer active:scale-95 min-h-[68px] ${
                    selectedReason === reason.id
                      ? reason.color === 'emerald' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm text-emerald-950 dark:text-emerald-100 font-bold' :
                        reason.color === 'amber' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 shadow-sm text-amber-950 dark:text-amber-100 font-bold' :
                        reason.color === 'orange' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20 shadow-sm text-orange-950 dark:text-orange-100 font-bold' :
                        reason.color === 'rose' ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-900/20 shadow-sm text-rose-950 dark:text-rose-100 font-bold' :
                        'border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm text-slate-950 dark:text-slate-100 font-bold'
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <reason.icon className={`h-4 w-4 mb-1 ${selectedReason === reason.id ? 
                    (reason.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : reason.color === 'amber' ? 'text-amber-500 dark:text-amber-400' : reason.color === 'orange' ? 'text-orange-500 dark:text-orange-400' : reason.color === 'rose' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400') 
                    : 'text-slate-400 dark:text-slate-600'}`} />
                  <span className="text-[9px] sm:text-[10px] tracking-tight text-center leading-none">
                    {reason.label}
                  </span>
                  <span className={`text-[8px] uppercase tracking-tighter mt-1 ${selectedReason === reason.id ? 
                    (reason.color === 'emerald' ? 'text-emerald-500 dark:text-emerald-400/80' : reason.color === 'amber' ? 'text-amber-600 dark:text-amber-400/80' : reason.color === 'orange' ? 'text-orange-600 dark:text-orange-400/80' : reason.color === 'rose' ? 'text-rose-600 dark:text-rose-400/80' : 'text-slate-500 dark:text-slate-400/80') 
                    : 'text-slate-400 dark:text-slate-600'}`}>
                    {reason.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category-Specific Inputs (Conditional rendering) */}
          
          {/* M-Pesa Input Panel */}
          {selectedReason === 'Sale_Mpesa' && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-200 dark:border-amber-900/30 space-y-4 animate-[fadeIn_0.2s_ease-out] text-center">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-1">
                <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">M-Pesa Coming Soon</h4>
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                  We are currently integrating with the Safaricom Daraja API. <br />
                  <strong>Please switch to the Cash option for now.</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedReason('Sale_Cash')}
                className="w-full py-2.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                Switch to Cash Sale
              </button>
            </div>
          )}

          {/* Deni (Credit) Autocomplete Lookup */}
          {selectedReason === 'Deni' && (
            <div className="bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-5 space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100 uppercase tracking-wider">Debtor Assignment Ledger</h4>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  id="add-new-customer-trigger"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 dark:text-amber-400 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-900/50 shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4 text-amber-600" />
                  <span>+ New Customer</span>
                </button>
              </div>

              {/* Inline Add Customer Form */}
              {showAddCustomer && (
                <form onSubmit={handleCreateCustomer} id="inline-customer-form" className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-300 dark:border-amber-900/50 shadow-md space-y-4">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">Quick Add Customer</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        required
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 0712..."
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        required
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(false)}
                      className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="save-inline-customer-btn"
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg shadow-sm hover:bg-amber-700 transition active:scale-95 cursor-pointer"
                    >
                      Save Customer
                    </button>
                  </div>
                </form>
              )}

              {/* Customer Search Autocomplete */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-500 block mb-2 tracking-wider">
                  Assign to Customer:
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-amber-600/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setCustomerSearchFocused(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedCustomer(null);
                    }}
                    placeholder="Search customer by name/phone..."
                    className="w-full bg-white dark:bg-slate-800 border border-amber-250 dark:border-amber-900/50 rounded-xl py-3.5 pl-10 pr-24 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  />
                  {selectedCustomer && (
                    <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-amber-900/50">
                      <Check className="h-3.5 w-3.5" /> Assigned
                    </span>
                  )}
                </div>

                {/* Autocomplete List Dropdown */}
                {customerSearchFocused && !selectedCustomer && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 rounded-xl shadow-2xl max-h-[160px] overflow-y-auto z-50 text-xs divide-y divide-slate-50 dark:divide-slate-700 ring-4 ring-amber-500/5">
                    {filteredCustomers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onMouseDown={() => {
                          setSelectedCustomer(cust);
                          setSearchQuery(cust.name);
                          setCustomerSearchFocused(false);
                        }}
                        id={`select-cust-${cust.id}`}
                        className="w-full px-4 py-3.5 hover:bg-amber-50/50 dark:hover:bg-slate-700 text-left flex justify-between items-center cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{cust.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{cust.phone}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tight block mb-0.5">UNPAID</span>
                          <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
                            KES {cust.debtBalance}
                          </span>
                        </div>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-[11px] font-medium italic">
                        No matching customer found. <br />
                        <span className="text-amber-600 dark:text-amber-400 font-bold not-italic">Tap "+ New Customer"</span> above!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* "Other" Conditional Requirement Reason */}
          {selectedReason === 'Other' && (
            <div className="space-y-1.5 animate-[fadeIn_0.2s_ease-out]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                State specific reason for deduction (Mandatory)
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                id="other-custom-reason-input"
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-1 focus:ring-emerald-600 focus:bg-white dark:focus:bg-slate-800 focus:outline-none min-h-[64px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Required. At least 5 characters (e.g. Returned to supplier)"
                maxLength={200}
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span>Must be at least 5 characters.</span>
                <span className={customReason.trim().length >= 5 ? 'text-emerald-650 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400 font-bold'}>
                  {customReason.trim().length}/5 characters
                </span>
              </div>
            </div>
          )}

          {/* Offline alert context */}
          {isOffline && (
            <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-900/30 text-sky-900 dark:text-sky-100 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
              <p className="text-[11px] leading-snug font-medium">
                <strong>Offline-First Resilience Active:</strong> This deduction is saved locally as <span className="font-mono text-sky-700 dark:text-sky-400">pending_sync</span> and will upload once connection returns.
              </p>
            </div>
          )}
        </div>

        {/* Thumb Zone Submission Buttons (Module 4 layout optimization) */}
        <div className="p-4.5 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-2 relative">
          
          {selectedReason === 'Sale_Mpesa' ? (
            <button
              type="button"
              disabled
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
            >
              Feature Unavailable
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitTrigger}
              disabled={
                isSubmitting ||
                (selectedReason === 'Other' && customReason.trim().length < 5) ||
                (selectedReason === 'Deni' && !selectedCustomer)
              }
              id="submit-deduction-btn"
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow active:scale-[0.98] cursor-pointer ${
                isSubmitting ||
                (selectedReason === 'Other' && customReason.trim().length < 5) ||
                (selectedReason === 'Deni' && !selectedCustomer)
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : selectedReason === 'Damaged' || selectedReason === 'Expired'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
              }`}
            >
              {isSubmitting ? 'Recording Ledger...' : 'Confirm Deduction'}
            </button>
          )}

          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium mt-1">
            Secured Audit Trail. Action will generate an unalterable log.
          </div>
        </div>
      </div>

      {/* SAFARICOM M-PESA POPUP SIMULATOR HANDLER (Module 3 Callback Sandbox) */}
      {showMpesaSandbox && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 text-white rounded-3xl w-full max-w-xs p-5 shadow-2xl space-y-4">
            
            {/* Phone notch design */}
            <div className="flex justify-center -mt-2">
              <div className="w-16 h-4 bg-black rounded-b-xl border-x border-b border-neutral-700" />
            </div>

            <div className="text-center space-y-1">
              <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto font-black text-xs">M</div>
              <p className="text-xs font-bold tracking-wider text-emerald-400">M-PESA STK SIMULATOR</p>
              <p className="text-[10px] text-neutral-400">Sent to: <span className="font-mono text-white">{mpesaPhone}</span></p>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 text-center space-y-2">
              <span className="text-[10px] text-neutral-450 block uppercase font-bold tracking-wider">Authorize Payment</span>
              <p className="text-xs text-white leading-relaxed font-medium">
                Do you want to pay KES <strong className="text-emerald-400 font-bold">{product.sellingPrice * quantity}</strong> to <strong className="text-emerald-400 font-bold">STOCKSAWA RETAIL</strong>?
              </p>
            </div>

            <div className="space-y-2 pt-2 font-bold">
              <button
                type="button"
                onClick={() => handleSandboxCallback(true)}
                id="mpesa-approve-simulation-btn"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer"
              >
                Enter PIN & Approve (ResultCode: 0)
              </button>
              <button
                type="button"
                onClick={() => handleSandboxCallback(false)}
                id="mpesa-cancel-simulation-btn"
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-[10px] text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                Decline STK Push / Cancel
              </button>
            </div>

            <div className="text-[9px] text-neutral-500 text-center font-medium">
              Testing simulated Daraja API callbacks natively.
            </div>
          </div>
        </div>
      )}

      {/* MANAGER QUICK-PIN VERIFICATION OVERLAY (Module 5) */}
      {showPinOverlay && (
        <div className="fixed inset-0 bg-slate-950/85 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col justify-end h-full sm:h-auto w-full sm:max-w-sm sm:rounded-2xl sm:border sm:border-slate-800 sm:bg-slate-950 sm:overflow-hidden sm:shadow-2xl">
            <div className="p-5 flex justify-between items-center border-b border-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-rose-500" />
                <span className="font-bold tracking-tight text-xs uppercase tracking-wider">Attendant Accountability Audit</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinOverlay(false)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 w-full">
              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-bold text-white">Please input admin PIN</h4>
                <p className="text-xs text-slate-400 leading-normal font-medium">
                  Non-sale actions require authorization to prevent stock shrinkage.
                </p>
              </div>

              {/* Display Circles */}
              <div className="flex justify-center gap-4 py-4" id="pin-dots-display">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-100 ${
                      pinCode.length > idx
                        ? 'bg-rose-500 border-rose-500 scale-110 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        : 'border-slate-800 bg-transparent'
                    }`}
                  />
                ))}
              </div>

              {/* PIN Error */}
              {pinError && (
                <div className="bg-rose-950/40 border border-rose-900 text-rose-200 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5" id="pin-error-alert">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  <span className="text-[11px] leading-tight font-semibold">{pinError}</span>
                </div>
              )}

              {/* Quick Helper */}
              <div className="bg-slate-900 border border-slate-800/80 text-slate-400 p-2.5 rounded-xl text-[10px] w-full text-center font-semibold">
                Only the designated admin PIN is allowed to authorize this action.
              </div>
            </div>

            {/* Tactile Keypad - Thumb Zone Optimized for mobile */}
            <div className="bg-slate-900 p-4 border-t border-slate-800/80 w-full">
              <div className="grid grid-cols-3 gap-2" id="tactile-pin-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinKeyPress(num)}
                    id={`keypad-btn-${num}`}
                    className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition active:bg-slate-600 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePinKeyPress('clear')}
                  id="keypad-btn-clear"
                  className="py-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 text-rose-400 text-xs font-bold tracking-wider transition cursor-pointer"
                >
                  RESET
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKeyPress('0')}
                  id="keypad-btn-0"
                  className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg transition cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handlePinKeyPress('back')}
                  id="keypad-btn-back"
                  className="py-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 font-bold transition flex items-center justify-center cursor-pointer"
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
