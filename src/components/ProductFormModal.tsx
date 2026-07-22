/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Barcode, HelpCircle, Save, Sparkles, Upload, Trash2, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Product } from '../types';
import { saveProduct, deleteProduct } from '../db/indexedDb';

interface ProductFormModalProps {
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
  onDelete?: (id: string) => void;
  productToEdit?: Product;
  initialSku?: string;
  showToast?: (msg: string) => void;
}

export default function ProductFormModal({ onClose, onSuccess, onDelete, productToEdit, initialSku, showToast }: ProductFormModalProps) {
  const [name, setName] = useState<string>(productToEdit?.name || '');
  const [sku, setSku] = useState<string>(productToEdit?.sku || initialSku || '');
  const [quantity, setQuantity] = useState<number>(productToEdit?.quantity ?? 10);
  const [sellingPrice, setSellingPrice] = useState<number | string>(productToEdit?.sellingPrice ?? '');
  const [costPrice, setCostPrice] = useState<number | string>(productToEdit?.costPrice ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(productToEdit?.imageUrl || null);
  
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [localToast, setLocalToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const showToastMsg = (msg: string, type: 'error' | 'success' = 'error') => {
    setLocalToast({ msg, type });
    setTimeout(() => setLocalToast(null), 3500);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-generate a realistic barcode/SKU
  const generateRandomSKU = () => {
    const prefix = '611100'; // Common Kenyan UPC prefix prefix
    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
    setSku(prefix + suffix);
  };

  // Image upload and client-side compression (Requirement 1.2)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instantly display the image using FileReader (no delay for user)
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        if (showToast) {
          showToast('Image selected successfully!');
        } else {
          showToastMsg('Image selected successfully!', 'success');
        }
      }
    };
    reader.readAsDataURL(file);

    // 2. Perform compression in the background
    compressAndSetImage(file);
    e.target.value = ''; // Reset input value
  };

  const compressAndSetImage = async (file: File) => {
    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 800,
        useWebWorker: false, // safer on mobile WebView/PWA
        fileType: 'image/webp'
      };
      const compressedFile = await imageCompression(file, options);
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
      setImageUrl(base64); // Replace with compressed version
      if (showToast) {
        showToast('Image optimized successfully!');
      } else {
        showToastMsg('Image optimized successfully!', 'success');
      }
    } catch (error) {
      console.error('Background compression failed, keeping original preview:', error);
      // Fallback is already loaded via FileReader, so we just log and continue
    } finally {
      setIsCompressing(false);
    }
  };

  // Camera Snapshot (Module 1.2)
  const startCameraSnap = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera capture failed', err);
      showToastMsg('Could not open camera. Please upload an image file instead.');
      setUseCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 800;
      canvas.height = (video.videoHeight / video.videoWidth) * 800;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'camera-snap.jpg', { type: 'image/jpeg' });
            await compressAndSetImage(file);
          }
        }, 'image/jpeg', 0.9);
      }
      stopCameraStream();
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setUseCamera(false);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sku.trim()) {
      showToastMsg('Product Name and SKU/Barcode are mandatory!');
      return;
    }

    const sPrice = Number(sellingPrice);
    const cPrice = Number(costPrice);

    if (isNaN(sPrice) || sPrice <= 0) {
      showToastMsg('Selling Price must be a positive number!');
      return;
    }

    if (isNaN(cPrice) || cPrice < 0) {
      showToastMsg('Cost price must be zero or positive!');
      return;
    }

    const updatedProduct: Product = {
      id: productToEdit ? productToEdit.id : 'p_' + Date.now(),
      name: name.trim(),
      sku: sku.trim(),
      quantity: Number(quantity),
      sellingPrice: sPrice,
      costPrice: cPrice,
      imageUrl: imageUrl,
      createdAt: productToEdit ? productToEdit.createdAt : new Date().toISOString()
    };

    try {
      await saveProduct(updatedProduct);
      onSuccess(updatedProduct);
    } catch (err) {
      console.error(err);
      showToastMsg('Could not save product. Check database configurations.');
    }
  };

  return (
    <div id="product-form-modal-overlay" className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div 
        id="product-form-modal-card"
        className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-[scaleIn_0.2s_ease-out]"
      >
        {/* Inline Toast */}
        {localToast && (
          <div className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold animate-[slideDown_0.2s_ease-out] ${
            localToast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            {localToast.type === 'error'
              ? <AlertCircle className="h-4 w-4 shrink-0" />
              : <CheckCircle className="h-4 w-4 shrink-0" />}
            <span>{localToast.msg}</span>
          </div>
        )}
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              {productToEdit ? 'Edit Shop Item' : 'Add New Shop Item'}
            </h3>
          </div>
          <button 
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            id="close-product-modal-btn"
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            
            {/* Photo upload / onboarding (Requirement 1.2) */}
            <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Product Image (Onboarding Camera)
            </label>
            
            {useCamera ? (
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-250">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Snap Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="h-20 w-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative group">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt="Product Preview" 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  )}
                  {isCompressing && (
                    <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-emerald-700 animate-pulse">Compressing...</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-center gap-1.5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCameraSnap}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-855 rounded-lg text-xs font-bold border border-emerald-200/50 transition cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-705 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-normal">
                    Supports high-resolution camera snaps compressed lightweight client-side.
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              id="new-product-name-input"
              className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-emerald-600 focus:outline-none placeholder-slate-400"
              placeholder="e.g. Broadways Bread 400g"
            />
          </div>

          {/* SKU / Barcode & Generate */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                SKU / Barcode Number *
              </label>
              <button
                type="button"
                onClick={generateRandomSKU}
                id="generate-sku-btn"
                className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 shadow-sm cursor-pointer"
              >
                <Barcode className="h-3.5 w-3.5" />
                <span>Auto-Gen Code</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.replace(/\D/g, ''))}
              id="new-product-sku-input"
              className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:ring-1 focus:ring-emerald-600 focus:outline-none placeholder-slate-400"
              placeholder="e.g. 6111001009115"
            />
          </div>

          {/* Pricing Row: Selling vs Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Selling Price (KES) *
              </label>
              <input
                type="number"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                id="new-product-price-input"
                className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none font-mono font-bold"
                placeholder="e.g. 150"
                min="1"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Cost Price (KES) *
              </label>
              <input
                type="number"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                id="new-product-cost-input"
                className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none font-mono font-bold"
                placeholder="e.g. 120"
                min="0"
              />
            </div>
          </div>

          {/* Initial quantity in shelf */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              {productToEdit ? 'Quantity On Shelves' : 'Initial Quantity On Shelves'}
            </label>
            <input
              type="number"
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              id="new-product-qty-input"
              className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none font-mono font-bold"
              placeholder="e.g. 10"
              min="0"
            />
          </div>

          {/* Profit margins helper overlay */}
          {sellingPrice && costPrice && Number(sellingPrice) > Number(costPrice) && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-950 p-3 rounded-xl text-xs flex justify-between items-center font-medium shrink-0">
              <span>Estimated Kiosk Markup Profit:</span>
              <strong className="text-emerald-700 font-mono font-bold">
                KES {Number(sellingPrice) - Number(costPrice)} ({Math.round(((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100)}%)
              </strong>
            </div>
          )}
          </div>

          {/* Buttons */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-2 font-bold">
            {productToEdit && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 rounded-xl border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer active:scale-95"
                title="Delete product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 bg-white text-xs text-center hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-new-product-btn"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>{productToEdit ? 'Update Product' : 'Save Product'}</span>
            </button>
          </div>
        </form>
        
        {/* Custom Delete Confirmation Overlay */}
        {showDeleteConfirm && productToEdit && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out] rounded-2xl sm:rounded-3xl">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-[slideUp_0.3s_ease-out]">
              <div className="p-5 flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Delete Product</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Are you sure you want to permanently delete <strong className="text-slate-700 dark:text-slate-200">"{productToEdit.name}"</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteProduct(productToEdit.id);
                    if (onDelete) onDelete(productToEdit.id);
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
