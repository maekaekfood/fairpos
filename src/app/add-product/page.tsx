'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScanLine,
  ArrowLeft,
  CheckCircle,
  CameraOff,
  FilePlus2,
  Loader2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import AddProductForm from '@/components/AddProductForm';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { Html5QrcodeResult, QrCodeSuccessCallback } from 'html5-qrcode/esm/core';

type Step = 'initial' | 'scanning' | 'form';

const QR_BOX_SIZE = 280;

export default function AddProductPage() {
  const [step, setStep] = useState<Step>('initial');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [hasCameraPermission, setHasCameraPermission]_useState<boolean>(true));
  const [scannerState, setScannerState] = useState<Html5QrcodeScannerState>(Html5QrcodeScannerState.NOT_STARTED);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/beep.mp3');
      const barcodeFromPOS = sessionStorage.getItem('scannedBarcode');
      if (barcodeFromPOS) {
        setScannedBarcode(barcodeFromPOS);
        setStep('form');
        sessionStorage.removeItem('scannedBarcode');
      }
    }
  }, []);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const cleanupScanner = useCallback(async () => {
    const currentScanner = html5QrCodeRef.current;
    if (currentScanner && currentScanner.getState() === Html5QrcodeScannerState.SCANNING) {
      try {
        await currentScanner.stop();
      } catch (err) {
        console.error('Failed to stop scanner', err);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);
  
  const playBeep = () => {
    audioRef.current?.play().catch(console.error);
  };

  const startScanning = useCallback(async () => {
    if (step !== 'scanning' || scannerState === Html5QrcodeScannerState.SCANNING) return;

    try {
      await Html5Qrcode.getCameras();
      setHasCameraPermission(true);

      const qrCodeSuccessCallback: QrCodeSuccessCallback = (decodedText, decodedResult) => {
        cleanupScanner();
        setScannedBarcode(decodedText);
        setStep('form');
        playBeep();
        toast({
          title: 'สแกนบาร์โค้ดสำเร็จ!',
          description: `รหัส: ${decodedText}`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        });
      };
      
      const qrCodeErrorCallback = (errorMessage: string) => {
        // console.warn(`QR error: ${errorMessage}`);
      };

      html5QrCodeRef.current = new Html5Qrcode('reader', { 
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
          aspectRatio: 1.0
        },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );
      setScannerState(Html5QrcodeScannerState.SCANNING);

    } catch (error) {
      console.error('Error starting scanner:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถเริ่มการสแกนได้',
        description: error instanceof Error ? error.message : 'กรุณาตรวจสอบการตั้งค่ากล้องและลองอีกครั้ง',
      });
      setStep('initial');
    }
  }, [step, cleanupScanner, toast, scannerState]);


  useEffect(() => {
    if (step === 'scanning') {
      startScanning();
    } else {
      cleanupScanner().then(() => {
        setScannerState(Html5QrcodeScannerState.NOT_STARTED);
      });
    }
  }, [step, startScanning, cleanupScanner]);


  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-4 text-lg">
            <Loader2 className="h-6 w-6 animate-spin" />
            กำลังโหลด...
          </div>
        </main>
      </div>
    );
  }

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                เพิ่มสินค้าใหม่
              </CardTitle>
              <CardDescription>
                สแกนบาร์โค้ดหรือกรอกรายละเอียดสินค้าด้วยตนเอง
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <Button
                variant="default"
                size="lg"
                className="h-32 flex-col gap-2 text-base"
                onClick={() => setStep('scanning')}
              >
                <ScanLine className="h-10 w-10" />
                สแกนบาร์โค้ด
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-32 flex-col gap-2 text-base"
                onClick={() => {
                  setScannedBarcode('');
                  setStep('form');
                }}
              >
                <FilePlus2 className="h-10 w-10" />
                เพิ่มด้วยตนเอง
              </Button>
            </CardContent>
          </Card>
        );
      case 'scanning':
        return (
          <Card>
            <CardHeader>
               <Button
                variant="ghost"
                onClick={() => setStep('initial')}
                className="w-fit p-0 h-auto mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                กลับ
              </Button>
              <CardTitle>สแกนบาร์โค้ด</CardTitle>
              <CardDescription>
                จัดตำแหน่งบาร์โค้ดให้อยู่ในกรอบเพื่อสแกน
              </CardDescription>
            </CardHeader>
            <CardContent>
                {!hasCameraPermission ? (
                   <div className="aspect-video w-full bg-black rounded-md flex flex-col items-center justify-center text-white p-4">
                    <CameraOff className="h-12 w-12 mb-4" />
                    <Alert variant="destructive" className="max-w-sm">
                      <AlertTitle>จำเป็นต้องใช้กล้อง</AlertTitle>
                      <AlertDescription>
                        โปรดอนุญาตให้เข้าถึงกล้องในเบราว์เซอร์ของคุณเพื่อใช้คุณสมบัตินี้
                      </AlertDescription>
                    </Alert>
                  </div>
                ): (
                  <div id="reader" className="w-full aspect-square rounded-md overflow-hidden bg-black relative">
                     {scannerState !== Html5QrcodeScannerState.SCANNING && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/50">
                           <Video className="h-12 w-12 mb-4"/>
                           <p>กำลังเปิดกล้อง...</p>
                        </div>
                     )}
                  </div>
                )}
            </CardContent>
          </Card>
        );
      case 'form':
        return (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setStep('initial');
                setScannedBarcode('');
              }}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปเริ่มต้น
            </Button>
            <AddProductForm
              hasBarcode={!!scannedBarcode}
              scannedBarcode={scannedBarcode}
            />
          </>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">{renderContent()}</div>
      </main>
    </div>
  );
}
