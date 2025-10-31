'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import Header from '@/components/Header';
import AddProductForm from '@/components/AddProductForm'; // Re-using the form component
import { Button } from '@/components/ui/button';
import EditProductForm from '@/components/EditProductForm';

export default function EditProductPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const { firestore } = useFirebase();

  const productRef = useMemoFirebase(
    () => (firestore && productId ? doc(firestore, 'products', productId) : null),
    [firestore, productId]
  );
  
  const { data: product, isLoading: isProductLoading } = useDoc<Product>(productRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);
  
  if (isUserLoading || isProductLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-4 text-lg">
            <Loader2 className="h-6 w-6 animate-spin" />
            กำลังโหลดข้อมูลสินค้า...
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center">
                <h1 className="text-2xl font-bold">ไม่พบสินค้า</h1>
                <p className="text-muted-foreground">ไม่พบสินค้าที่คุณต้องการแก้ไข</p>
                 <Button onClick={() => router.push('/inventory')} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปหน้าสต็อก
                </Button>
              </div>
          </main>
        </div>
      )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-start p-4">
        <div className="w-full max-w-md">
           <Button
              variant="ghost"
              onClick={() => router.push('/inventory')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปหน้าสต็อก
            </Button>
            <EditProductForm
              product={product}
            />
        </div>
      </main>
    </div>
  );
}
