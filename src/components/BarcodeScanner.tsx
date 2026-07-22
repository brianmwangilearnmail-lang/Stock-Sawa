import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, ScanLine, Barcode, Loader2, ZapOff } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerProps {
  onScan: (sku: string) => void;
  onClose: () => void;
  products: Product[];
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scannedRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Request camera permission and get stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (mounted) setIsInitializing(false);

        // Use BarcodeDetector API (native Android Chrome / WebView support)
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: [
              'ean_13', 'ean_8', 'qr_code', 'code_128', 'code_39',
              'code_93', 'codabar', 'data_matrix', 'upc_a', 'upc_e', 'itf',
            ],
          });

          const scan = async () => {
            if (!mounted || scannedRef.current) return;
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && !scannedRef.current) {
                  scannedRef.current = true;
                  stopCamera();
                  onScan(barcodes[0].rawValue);
                  return;
                }
              } catch (_) {
                // no barcode found in this frame, continue
              }
            }
            animFrameRef.current = requestAnimationFrame(scan);
          };

          animFrameRef.current = requestAnimationFrame(scan);
        } else {
          // Fallback: canvas + jsQR-style manual scan if BarcodeDetector not available
          if (mounted) setError('Barcode scanning is not supported on this browser. Please use Chrome on Android.');
        }
      } catch (err: any) {
        console.error('Camera error:', err);
        if (mounted) {
          if (err.name === 'NotAllowedError') {
            setError('Camera permission was denied. Please allow camera access in your phone settings and try again.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera found on this device.');
          } else {
            setError(`Could not start camera: ${err.message}`);
          }
          setIsInitializing(false);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [onScan, stopCamera]);

  return (
    <div
      id="barcode-scanner-overlay"
      className="fixed inset-0 bg-black z-50 flex flex-col"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-3 bg-black/60 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2">
          <Barcode className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold tracking-tight text-sm text-white">StockSawa Smart Scan</span>
        </div>
        <button
          onClick={handleClose}
          id="close-scanner-btn"
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close scanner"
        >
          <X className="h-5 w-5 text-gray-300" />
        </button>
      </div>

      {/* Camera View */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        {/* The native video element — React fully controls this */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          style={{ display: isInitializing || error ? 'none' : 'block' }}
        />

        {/* Loading state */}
        {isInitializing && !error && (
          <div className="flex flex-col items-center gap-3 text-emerald-400 z-10">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="text-sm font-medium text-white">Opening Camera...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="z-10 px-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-rose-500/20 flex items-center justify-center">
              <ZapOff className="h-8 w-8 text-rose-400" />
            </div>
            <p className="text-sm font-medium text-rose-300">{error}</p>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-semibold"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Scanning frame overlay — shown once camera is live */}
        {!isInitializing && !error && (
          <>
            {/* Dimmed overlay with cutout */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-72 h-44 relative">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Animated scan line */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.8)]"
                  style={{ animation: 'scanline 2s ease-in-out infinite' }}
                />
              </div>
            </div>

            {/* Status chip */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
              <ScanLine className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono tracking-widest text-emerald-400">SCANNING...</span>
            </div>

            <Camera className="absolute top-6 right-6 h-5 w-5 text-white/30 z-20" />
          </>
        )}
      </div>

      {/* Bottom hint */}
      {!error && (
        <div className="bg-black/80 py-3 px-4 text-center z-20">
          <p className="text-xs text-gray-400">Point your camera at any barcode to scan it automatically</p>
        </div>
      )}

      {/* Keyframe for scan line animation */}
      <style>{`
        @keyframes scanline {
          0% { top: 0%; }
          50% { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
