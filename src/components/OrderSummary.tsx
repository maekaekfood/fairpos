'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderItem, Product } from '@/lib/types';
import { Trash2, ShoppingBag, MinusCircle, PlusCircle, ScanLine, Save, RefreshCw } from 'lucide-react';
import QRCodeSheet from './QRCodeSheet';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, where, getDocs, limit, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import BarcodeScannerSheet from './BarcodeScannerSheet';


type OrderSummaryProps = {
  orderItems: OrderItem[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onClearOrder: () => void;
  onAddToOrder: (product: Product) => void;
  editingTransaction?: {id: string, discount: number} | null;
};

export default function OrderSummary({ orderItems, onUpdateQuantity, onClearOrder, onAddToOrder, editingTransaction }: OrderSummaryProps) {
  const [discountAmount, setDiscountAmount] = useState(0);
  const [view, setView] = useState<'summary' | 'payment'>('summary');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firestore } = useFirebase();

  useEffect(() => {
    if (editingTransaction) {
      setDiscountAmount(editingTransaction.discount);
    } else {
      setDiscountAmount(0);
    }
  }, [editingTransaction]);

  const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = Number(e.target.value);
    setDiscountAmount(amount >= 0 ? amount : 0);
  };

  const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const totalDiscount = discountAmount;

  const total = subtotal - totalDiscount;

  const handleConfirmPayment = () => {
    if (editingTransaction) {
        handleUpdateTransaction();
    } else {
        setView('payment');
    }
  };

  const findProductByBarcode = async (barcode: string): Promise<Product | null> => {
    if (!firestore) return null;
    const productsRef = collection(firestore, 'products');
    const q = query(productsRef, where('barcode', '==', barcode), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Product;
  };
  
  const handlePaymentSuccess = () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้",
      });
      return;
    }
    
    // 1. Prepare data for receipt and database
    const transactionData = {
        orderItems,
        subtotal,
        discount: totalDiscount,
        total,
        createdAt: Timestamp.now(),
    };
    
    // 2. Store data in session storage to pass to the receipt page
    sessionStorage.setItem('receiptData', JSON.stringify(transactionData));

    // 3. Save the transaction to Firestore non-blockingly
    const transactionsCollectionRef = collection(firestore, 'transactions');
    addDocumentNonBlocking(transactionsCollectionRef, transactionData);

    // 4. Clear the current order state
    onClearOrder();
    setView('summary');
    setDiscountAmount(0);

    // 5. Navigate to the receipt page
    router.push('/receipt');

    toast({
        title: "ชำระเงินสำเร็จ",
        description: "กำลังสร้างใบเสร็จ...",
    });
  }

  const handleUpdateTransaction = () => {
    if (!firestore || !editingTransaction) return;

    const updatedTransactionData = {
        orderItems,
        subtotal,
        discount: totalDiscount,
        total,
    };
    
    const transactionDocRef = doc(firestore, 'transactions', editingTransaction.id);
    updateDocumentNonBlocking(transactionDocRef, updatedTransactionData);

    toast({
        title: "อัปเดตรายการสำเร็จ",
        description: `รายการขายถูกอัปเดตแล้ว`,
    });

    onClearOrder(); // This will also clear editingTransaction state in parent
    router.push('/summary');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  const handleBackToSummary = () => {
    setView('summary');
  }

  return (
    <>
    <Card className="sticky top-20 shadow-lg flex flex-col h-[calc(100vh-7rem)]">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline text-xl">
                    {editingTransaction ? 'แก้ไขรายการขาย' : 'รายการปัจจุบัน'}
                </CardTitle>
                <CardDescription>
                    {editingTransaction ? `ID: ${editingTransaction.id.substring(0,6)}...` : 'ตรวจสอบสินค้าก่อนยืนยัน'}
                </CardDescription>
            </div>
            <Button variant="outline" size="lg" className="p-2 h-12 w-12" onClick={() => setIsScannerOpen(true)}>
                <ScanLine className="h-7 w-7"/>
                <span className="sr-only">สแกนบาร์โค้ดสินค้า</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-0">
        {orderItems.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <ShoppingBag className="h-16 w-16" />
            <p className="mt-4 font-medium">ยังไม่มีสินค้าในรายการ</p>
            <p className="mt-1 text-sm">เพิ่มสินค้าโดยการคลิกหรือสแกน</p>
          </div>
        ) : (
          <ScrollArea className="flex-grow h-0 px-6">
            <div className="space-y-4">
              {orderItems.map(item => (
                <div key={item.id} className="flex items-center gap-4">
                   <Image
                      src={item.imageUrl || ''}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="rounded-md object-cover aspect-square bg-muted"
                    />
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                        <MinusCircle className="h-4 w-4" />
                    </Button>
                    <span className="font-mono text-sm w-4 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onUpdateQuantity(item.id, 0)}>
                      <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="flex-col !p-6 !pt-2 border-t mt-auto">
        {view === 'summary' ? (
          <>
            <div className="w-full space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">ส่วนลด</h4>
                <Input 
                  type="number" 
                  placeholder="ใส่จำนวนเงิน (บาท)" 
                  className="mt-2"
                  value={discountAmount > 0 ? discountAmount : ''}
                  onChange={handleDiscountAmountChange}
                />
              </div>

              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>ยอดรวม (ก่อนลด)</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>ส่วนลด</span>
                  <span className="text-destructive">-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-foreground">
                  <span>ยอดสุทธิ</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            
            <div className="w-full mt-4 grid grid-cols-1 gap-2">
                {editingTransaction && (
                    <Button 
                        variant="secondary"
                        onClick={onClearOrder}
                    >
                       <RefreshCw className="mr-2 h-4 w-4"/> ยกเลิกการแก้ไข
                    </Button>
                )}
                <Button 
                size="lg" 
                disabled={orderItems.length === 0}
                onClick={handleConfirmPayment}
                >
                {editingTransaction ? (
                    <>
                        <Save className="mr-2 h-4 w-4" /> อัปเดตรายการ
                    </>
                ) : (
                    'ยืนยันการชำระเงิน'
                )}
                </Button>
            </div>
          </>
        ) : (
          <QRCodeSheet
            onPaymentSuccess={handlePaymentSuccess}
            onBack={handleBackToSummary}
            totalAmount={total}
          />
        )}
      </CardFooter>
    </Card>

    <BarcodeScannerSheet
      isOpen={isScannerOpen}
      onOpenChange={setIsScannerOpen}
      onBarcodeScanned={async (barcode) => {
        const product = await findProductByBarcode(barcode);
        if (product) {
            onAddToOrder(product);
            toast({
                title: 'เพิ่มสินค้าแล้ว',
                description: `เพิ่ม "${product.name}" 1 ชิ้น.`,
            });
            return true; // Indicates success, scanner might stay open
        }
        return false; // Indicates product not found
      }}
    />
    </>
  );
}
