/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, ScanLine, Barcode, HelpCircle } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerProps {
  onScan: (sku: string) => void;
  onClose: () => void;
  products: Product[];
}

export default function BarcodeScanner({ onScan, onClose, products }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  useEffect(() => {
    async function startCamera() {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } catch (err: any) {
        console.error('Camera access error:', err);
        setError(
          'Could not access the physical camera. Showing premium high-fidelity scan simulator.'
        );
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSimulateScan = (sku: string) => {
    onScan(sku);
  };

  return (
    <div id="barcode-scanner-overlay" className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      {/* Top bar */}
      <div className="w-full max-w-md flex justify-between items-center mb-4 text-white">
        <div className="flex items-center gap-2">
          <Barcode className="h-5 w-5 text-emerald-400" id="barcode-icon" />
          <span className="font-semibold tracking-tight text-sm">StockSawa Smart Scan</span>
        </div>
        <button
          onClick={onClose}
          id="close-scanner-btn"
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5 text-gray-300" />
        </button>
      </div>

      {/* Main Scanner Container */}
      <div className="relative w-full max-w-md aspect-square bg-gray-950 rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center shadow-2xl">
        {cameraActive ? (
          <video
            ref={videoRef}
            id="scanner-video-feed"
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
        ) : (
          <div className="p-6 text-center text-gray-400 max-w-xs flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 animate-pulse">
              <Camera className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-white">Camera Simulator Active</p>
            <p className="text-xs text-gray-400">
              Align a barcode inside the guide box or use the quick scan panel below for instant lookup testing.
            </p>
          </div>
        )}

        {/* Scan Guide Frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
          <div className="relative w-full h-2/3 border-2 border-emerald-400/40 rounded-xl bg-black/20">
            {/* Corners */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

            {/* Scanning Line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[bounce_2s_infinite]" />
          </div>
        </div>

        {/* Simulated scanning feedback */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 pointer-events-none">
          <ScanLine className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono tracking-wider text-emerald-400">SEEKING BARCODE</span>
        </div>
      </div>

      {/* Quick Test Barcode Drawer */}
      <div className="w-full max-w-md mt-6 bg-gray-900/90 rounded-xl p-4 border border-white/5 shadow-lg flex flex-col gap-2">
        <div className="flex items-center gap-1 text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <HelpCircle className="h-4 w-4 text-emerald-400" />
          <span>Tap Product SKU to Simulate Scan:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => handleSimulateScan(p.sku)}
              id={`simulate-scan-${p.id}`}
              className="flex flex-col items-start p-2 rounded bg-gray-800/60 hover:bg-emerald-950/40 hover:border-emerald-500/40 border border-transparent transition text-left group"
            >
              <span className="text-white text-xs font-medium truncate w-full group-hover:text-emerald-300">
                {p.name}
              </span>
              <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                <Barcode className="h-2.5 w-2.5 text-emerald-500" />
                {p.sku}
              </span>
            </button>
          ))}
          {products.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 text-xs py-3">
              No products available to scan. Add a product first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
