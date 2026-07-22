import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, ScanLine, Barcode, HelpCircle, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (sku: string) => void;
  onClose: () => void;
  products: Product[];
}

export default function BarcodeScanner({ onScan, onClose, products }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let mounted = true;
    const scannerId = "reader";
    
    const startScanner = async () => {
      try {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (html5QrCodeRef.current?.isScanning) {
              html5QrCodeRef.current.pause();
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore frame errors
          }
        );
      } catch (err: any) {
        console.error("Scanner initialization error:", err);
        setError("Camera permission denied or camera not accessible.");
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    // Small delay to allow the div to render properly before mounting scanner
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  // No manual simulation handling needed anymore

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
      <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center shadow-2xl">
        
        {/* The target div for Html5Qrcode */}
        <div id="reader" className="w-full aspect-square overflow-hidden bg-black flex items-center justify-center">
           {isInitializing && !error && (
             <div className="flex flex-col items-center gap-3 text-emerald-500">
               <Loader2 className="w-8 h-8 animate-spin" />
               <span className="text-sm font-medium">Starting Camera...</span>
             </div>
           )}
           {error && (
             <div className="p-6 text-center text-rose-400 max-w-xs flex flex-col items-center gap-3">
               <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mb-2">
                 <Camera className="h-6 w-6" />
               </div>
               <p className="text-sm font-medium">{error}</p>
             </div>
           )}
        </div>

        {/* Scan Guide Frame (Overlay) */}
        {!isInitializing && !error && (
          <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
            <div className="relative w-full h-[150px] max-w-[250px] rounded-lg">
              {/* Corners */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Scanning Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[bounce_2s_infinite]" />
            </div>
          </div>
        )}
        
        {/* Scanning feedback */}
        {!isInitializing && !error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 pointer-events-none">
            <ScanLine className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-wider text-emerald-400">SEEKING BARCODE</span>
          </div>
        )}
      </div>

      {/* Simulation drawer completely removed to enforce real scanning */}
    </div>
  );
}
