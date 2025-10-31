'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Receipt from '@/components/Receipt';
import type { OrderItem } from '@/lib/types';

interface ReceiptData {
  orderItems: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
}

export default function ReceiptPage() {
  const router = useRouter();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    // This code runs only on the client-side
    const data = sessionStorage.getItem('receiptData');
    if (data) {
      try {
        setReceiptData(JSON.parse(data));
      } catch (error) {
        console.error("Failed to parse receipt data from session storage", error);
        router.replace('/'); // Redirect if data is invalid
      }
    } else {
      // If there's no data, redirect to the main page
      router.replace('/');
    }
  }, [router]);
  
  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    // Clear session storage on back navigation to prevent re-displaying old receipt
    sessionStorage.removeItem('receiptData');
    router.push('/');
  }

  if (!receiptData) {
    return null; // Or a loading spinner
  }

  return (
    <div className="bg-secondary min-h-screen flex flex-col items-center justify-center p-4 print-container">
        <style jsx global>{`
          @page {
            size: auto;
            margin: 0mm;
          }
          @media print {
            body, html {
              background: #fff !important;
              -webkit-print-color-adjust: exact;
            }
            .print-container {
               background-color: transparent !important;
               padding: 0;
               margin: 0 auto;
               justify-content: flex-start;
               width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .printable-receipt {
              display: block !important;
              margin: 0 auto;
              padding: 0;
              width: 100%;
              max-width: 80mm;
              box-shadow: none;
              border-radius: 0;
              border: none;
            }
          }
        `}</style>
      <div className="w-full max-w-sm bg-background rounded-lg shadow-lg printable-receipt">
         <div id="receipt-section">
            <Receipt {...receiptData} />
         </div>
      </div>
      <div className="w-full max-w-sm mt-6 flex flex-col sm:flex-row gap-2 px-4 sm:px-0 no-print">
        <Button variant="outline" className="w-full" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปหน้าขาย
        </Button>
        <Button className="w-full" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> พิมพ์ใบเสร็จ
        </Button>
      </div>
    </div>
  );
}
