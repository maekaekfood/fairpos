'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import placeholderImages from '@/lib/placeholder-images.json';
import { PlusCircle, PackageOpen, Search } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';

function POSGridSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg shadow-sm p-4 space-y-3">
            <Skeleton className="h-32 w-full rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}


type POSGridProps = {
  onAddToOrder: (product: Product) => void;
};

export default function POSGrid({ onAddToOrder }: POSGridProps) {
  const { firestore } = useFirebase();
  const [searchQuery, setSearchQuery] = useState('');

  const productsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'products'), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );

  const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  if (isLoading) {
    return <POSGridSkeleton />;
  }

  if (error) {
    return <p className="text-destructive text-center">เกิดข้อผิดพลาดในการโหลดสินค้า: {error.message}</p>;
  }


  return (
    <div className="space-y-4">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
            type="text"
            placeholder="ค้นหาสินค้า..."
            className="w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {filteredProducts.length === 0 ? (
             <div className="flex flex-col items-center justify-center text-center p-10 bg-card rounded-lg shadow-sm h-full">
                <PackageOpen className="h-20 w-20 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">
                    {products && products.length > 0 ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่มีสินค้าในสต็อก'}
                </h3>
                <p className="mt-1 text-muted-foreground">
                    {products && products.length > 0 ? 'ลองใช้คำค้นหาอื่น' : 'กรุณาเพิ่มสินค้าในหน้าสต็อกก่อน'}
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} className="bg-card rounded-lg shadow-sm overflow-hidden flex flex-col">
                    <div className="relative w-full aspect-square">
                        <Image
                        src={
                            product.imageUrl ||
                            placeholderImages.placeholderImages[0]?.imageUrl
                        }
                        alt={product.name}
                        fill
                        className="object-cover bg-muted"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        data-ai-hint="product photo"
                        />
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                        <h3 className="font-semibold text-sm flex-grow">{product.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="p-3 pt-0">
                        <Button className="w-full" onClick={() => onAddToOrder(product)}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            เพิ่ม
                        </Button>
                    </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}
