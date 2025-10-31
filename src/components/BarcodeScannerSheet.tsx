'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from './ui/button';
import { CameraOff, FilePlus2, Loader2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCodeSuccessCallback } from 'html5-qrcode/esm/core';

interface BarcodeScannerSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onBarcodeScanned: (barcode: string) => Promise<boolean>;
}

const QR_BOX_SIZE = 280;

export default function BarcodeScannerSheet({
  isOpen,
  onOpenChange,
  onBarcodeScanned,
}: BarcodeScannerSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [scannerState, setScannerState] = useState<Html5QrcodeScannerState>(Html5QrcodeScannerState.NOT_STARTED);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupScanner = useCallback(async () => {
    const currentScanner = html5QrCodeRef.current;
    if (currentScanner && currentScanner.getState() === Html5QrcodeScannerState.SCANNING) {
      try {
        await currentScanner.stop();
      } catch (err) {
        // This can happen if the scanner is already in a stopped state.
        // It's safe to ignore.
        console.error("Failed to stop scanner", err);
      }
    }
  }, []);

  const handleScanSuccess: QrCodeSuccessCallback = async (decodedText, decodedResult) => {
    setScannedBarcode(decodedText);
    playBeep();
    
    const wasProductFound = await onBarcodeScanned(decodedText);

    if (!wasProductFound) {
      setProductNotFound(true);
      if (html5QrCodeRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCodeRef.current?.pause(true);
      }
    } else {
      setProductNotFound(false);
      // Optional: Close scanner on success
      // onOpenChange(false);
    }
  };

  const startScanning = useCallback(async () => {
     if (!isOpen || scannerState === Html5QrcodeScannerState.SCANNING) return;
    if (!document.getElementById('sheet-reader')) {
      return;
    }

    try {
      await Html5Qrcode.getCameras();
      setHasCameraPermission(true);

      html5QrCodeRef.current = new Html5Qrcode('sheet-reader', { 
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
          ]
      });
      
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE },
          aspectRatio: 1.0,
        },
        handleScanSuccess,
        (errorMessage) => { /* Optional: handle errors */ }
      );
      setScannerState(Html5QrcodeScannerState.SCANNING);

    } catch (error) {
      console.error('Error starting scanner:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาดกับกล้อง',
        description: error instanceof Error ? error.message : 'กรุณาตรวจสอบการอนุญาตเข้าถึงกล้อง',
      });
      onOpenChange(false);
    }
  }, [isOpen, onBarcodeScanned, onOpenChange, toast, handleScanSuccess, scannerState]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/beep.mp3');
    }
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      setProductNotFound(false);
      setScannedBarcode(null);
      // Use a small timeout to allow the sheet to render before starting the scanner
      const timer = setTimeout(() => startScanning(), 100);
      return () => clearTimeout(timer);
    } else {
      cleanupScanner().then(() => {
        setScannerState(Html5QrcodeScannerState.NOT_STARTED);
      });
    }
    return () => {
      cleanupScanner();
    };
  }, [isOpen, startScanning, cleanupScanner]);
  
  const playBeep = () => {
    audioRef.current?.play().catch(console.error);
  }

  const resumeScanning = () => {
    setProductNotFound(false);
    setScannedBarcode(null);
    if(html5QrCodeRef.current && html5QrCodeRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCodeRef.current.resume();
    }
  }

  const goToAddProductPage = () => {
    onOpenChange(false);
    router.push('/add-product');
    if (scannedBarcode) {
      sessionStorage.setItem('scannedBarcode', scannedBarcode);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col h-[90vh] sm:h-auto">
        <SheetHeader>
          <SheetTitle>สแกนบาร์โค้ดสินค้า</SheetTitle>
          <SheetDescription>
            จัดตำแหน่งบาร์โค้ดให้อยู่ในกรอบเพื่อเพิ่มสินค้าเข้ารายการ
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
          {!hasCameraPermission ? (
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>จำเป็นต้องใช้กล้อง</AlertTitle>
              <AlertDescription>
                โปรดอนุญาตให้เข้าถึงกล้องในเบราว์เซอร์ของคุณ
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="w-full max-w-md aspect-square bg-black rounded-md overflow-hidden relative">
                <div id="sheet-reader" className="w-full h-full" />
                {scannerState !== Html5QrcodeScannerState.SCANNING && !productNotFound && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/50">
                      <Video className="h-12 w-12 mb-4"/>
                      <p>กำลังเปิดกล้อง...</p>
                  </div>
                )}
                {productNotFound && scannedBarcode && (
                    <div className='absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center text-white p-4 space-y-4 text-center'>
                        <h3 className='text-lg font-semibold'>ไม่พบสินค้า</h3>
                        <p>ไม่พบสินค้าที่มีบาร์โค้ด <br/> <span className='font-mono bg-white/20 px-2 py-1 rounded-md'>{scannedBarcode}</span></p>
                        <div className='flex flex-col sm:flex-row gap-2 w-full max-w-xs'>
                            <Button variant="secondary" onClick={resumeScanning}>สแกนอีกครั้ง</Button>
                            <Button onClick={goToAddProductPage}>
                                <FilePlus2 className='mr-2 h-4 w-4'/>
                                เพิ่มสินค้าใหม่
                            </Button>
                        </div>
                    </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
