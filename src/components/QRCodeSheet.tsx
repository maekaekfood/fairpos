'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Camera, Edit, Loader2, QrCode, CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface QRCodeSheetProps {
  onPaymentSuccess: () => void;
  onBack: () => void;
  totalAmount: number;
}

// Function to upload to Google Drive - similar to AddProductForm
async function uploadToGoogleDrive(
  file: File,
  fileName: string,
  accessToken: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    mimeType: file.type,
    parents: ['1H7krY1kmrY4FB4fhyGpIOLnEJZf2o4XE'], // Specific folder for QR codes
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`การอัปโหลดไปที่ Google Drive ล้มเหลว: ${errorData.error?.message || response.statusText}`);
  }
  const result = await response.json();
  await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'role': 'reader', 'type': 'anyone' }),
  });
  const directLink = `https://drive.google.com/uc?id=${result.id}`;
  return { id: result.id, webViewLink: directLink };
}

export default function QRCodeSheet({ onPaymentSuccess, onBack, totalAmount }: QRCodeSheetProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const paymentSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'payment') : null),
    [firestore]
  );
  const { data: paymentSettings, isLoading } = useDoc<{ qrCodeUrl?: string }>(paymentSettingsRef);

  useEffect(() => {
    // If we enter editing mode, and there's an existing QR code, show it as the preview
    if (isEditing && paymentSettings?.qrCodeUrl) {
      setPreview(paymentSettings.qrCodeUrl);
    }
  }, [isEditing, paymentSettings]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveQrCode = () => {
    if (!firestore || !imageFile) {
      toast({ variant: 'destructive', title: 'ไม่มีไฟล์', description: 'กรุณาเลือกรูปภาพ QR Code ใหม่' });
      return;
    }
    startTransition(async () => {
      try {
        const accessToken = window.sessionStorage.getItem('google-access-token');
        if (!accessToken) throw new Error('ไม่พบ Access Token ของ Google');

        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const fileExtension = imageFile.name.split('.').pop() || 'png';
        const newFileName = `${dateStr}_QR_จ่ายเงิน.${fileExtension}`;

        const { webViewLink } = await uploadToGoogleDrive(imageFile, newFileName, accessToken);

        const settingsRef = doc(firestore, 'settings', 'payment');
        await setDoc(settingsRef, { qrCodeUrl: webViewLink }, { merge: true });

        toast({ title: 'บันทึกสำเร็จ', description: 'QR Code สำหรับชำระเงินถูกอัปเดตแล้ว' });
        setIsEditing(false);
        setImageFile(null);
        // Preview will be updated by the useDoc hook automatically
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        toast({ variant: 'destructive', title: 'การบันทึกล้มเหลว', description: errorMessage });
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setPreview(null);
    setImageFile(null);
  }

  if (isLoading) {
      return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <div className='w-full space-y-4 animate-in fade-in-50'>
         <div className="flex items-center relative border-b pb-4">
            <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
                 <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                    <QrCode/> สแกนเพื่อชำระเงิน
                 </h3>
                 <p className="text-muted-foreground text-sm">
                    ยอดชำระเงินทั้งหมด: {formatCurrency(totalAmount)}
                 </p>
            </div>
         </div>


        <div className="py-4">
          {isEditing ? (
            <div className="space-y-4">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              {preview ? (
                <div className="relative group rounded-lg overflow-hidden border">
                  <Image src={preview} alt="QR Code Preview" width={400} height={400} className="object-contain aspect-square w-full" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Camera className="h-10 w-10 mb-2" />
                  <span>เลือกรูปภาพ QR Code</span>
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>ยกเลิก</Button>
                <Button onClick={handleSaveQrCode} disabled={isPending || !imageFile}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4"/>}
                    บันทึก
                </Button>
              </div>
            </div>
          ) : (
            paymentSettings?.qrCodeUrl ? (
                <div className="w-full flex justify-center">
                    <Image src={paymentSettings.qrCodeUrl} alt="Payment QR Code" width={400} height={400} className="object-contain aspect-square rounded-md bg-white p-2" />
                </div>
            ) : (
                <Alert>
                    <Package className="h-4 w-4"/>
                    <AlertTitle>ยังไม่มี QR Code</AlertTitle>
                    <AlertDescription>
                        กรุณากดปุ่ม "แก้ไข" เพื่อเพิ่ม QR Code สำหรับการชำระเงิน
                    </AlertDescription>
                </Alert>
            )
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> แก้ไข
              </Button>
              <Button onClick={onPaymentSuccess}>
                <CheckCircle className="mr-2 h-4 w-4" /> ชำระเงินแล้ว
              </Button>
            </>
          )}
        </div>
    </div>
  );
}
