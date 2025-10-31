'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import placeholderImages from '@/lib/placeholder-images.json';
import { PackageOpen, Trash2, Loader2, PlusCircle, Pencil, Search } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Input } from './ui/input';
import { useRouter } from 'next/navigation';


async function deleteGoogleDriveFile(fileId: string, accessToken: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) { // 404 means it's already gone, which is fine
    const errorData = await response.json().catch(() => ({})); // Catch if no JSON body
    console.error('Google Drive Delete Error:', errorData);
    throw new Error(`การลบไฟล์จาก Google Drive ล้มเหลว: ${errorData.error?.message || response.statusText}`);
  }
}


function ProductListSkeleton() {
  return (
     <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-2">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-[50px]" />
          <Skeleton className="h-8 w-[50px]" />
        </div>
      ))}
    </div>
  );
}

export default function ProductList() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
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


  const handleDelete = async (productId: string, product: Product) => {
    if (!firestore) return;

    setDeletingId(productId);

    try {
      if (product.imageUrl && product.imageUrl.includes('drive.google.com')) {
        const urlParams = new URLSearchParams(new URL(product.imageUrl).search);
        const fileId = urlParams.get('id');
        const accessToken = window.sessionStorage.getItem('google-access-token');

        if (fileId && accessToken) {
          await deleteGoogleDriveFile(fileId, accessToken);
        } else if (!accessToken) {
          throw new Error('ไม่พบ Access Token โปรดลงชื่อเข้าใช้อีกครั้ง');
        }
      }

      const docRef = doc(firestore, 'products', productId);
      deleteDocumentNonBlocking(docRef);

      toast({
          title: "ลบสินค้าแล้ว",
          description: `"${product.name}" ถูกลบออกจากสินค้าคงคลังของคุณแล้ว`,
      });

    } catch (e: any) {
        console.error("Deletion failed:", e);
        toast({
            variant: "destructive",
            title: "การลบล้มเหลว",
            description: e.message || "ไม่สามารถลบสินค้าหรือรูปภาพได้",
        });
    } finally {
        setDeletingId(null);
    }
  };
  
  const handleEdit = (productId: string) => {
    router.push(`/inventory/edit/${productId}`);
  }

  if (isLoading) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="font-headline text-2xl">สต็อกสินค้า</CardTitle>
                        <CardDescription>จัดการสินค้าทั้งหมดในร้านของคุณ</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/add-product">
                            <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มสินค้าใหม่
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ProductListSkeleton />
            </CardContent>
        </Card>
    );
  }

  if (error) {
    return <p className="text-destructive text-center">เกิดข้อผิดพลาดในการโหลดสินค้า: {error.message}</p>;
  }

  if (!products || products.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 border-2 border-dashed">
        <PackageOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-xl font-semibold text-foreground">
          สินค้าคงคลังของคุณว่างเปล่า
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          เริ่มต้นด้วยการเพิ่มสินค้าชิ้นแรกของคุณ
        </p>
         <Button asChild className="mt-6">
            <Link href="/add-product">
                <PlusCircle className="mr-2 h-4 w-4"/> เพิ่มสินค้าใหม่
            </Link>
        </Button>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">สต็อกสินค้า</CardTitle>
                <CardDescription>จัดการสินค้าทั้งหมดในร้านของคุณ ({products.length} รายการ)</CardDescription>
            </div>
            <Button asChild>
                <Link href="/add-product">
                    <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มสินค้าใหม่
                </Link>
            </Button>
        </div>
        <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
            type="text"
            placeholder="ค้นหาสินค้าด้วยชื่อ..."
            className="w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">รูปภาพ</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>บาร์โค้ด</TableHead>
              <TableHead className="text-right">ราคา</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead className="text-right">การกระทำ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(product => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image
                    src={
                      product.imageUrl ||
                      placeholderImages.placeholderImages[0]?.imageUrl
                    }
                    alt={product.name}
                    width={64}
                    height={64}
                    className="rounded-md object-cover aspect-square bg-muted"
                    data-ai-hint="product image"
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                <TableCell>
                  {product.barcode ? (
                    <Badge variant="secondary">{product.barcode}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(product.price)}
                </TableCell>
                <TableCell className="text-right font-mono">{product.quantity}</TableCell>
                 <TableCell className="text-right">
                    <div className='flex gap-2 justify-end'>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product.id)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={deletingId === product.id}>
                                {deletingId === product.id ? <Loader2 className="animate-spin"/> : <Trash2 className="h-4 w-4" />}
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                                <AlertDialogDescription>
                                การกระทำนี้ไม่สามารถย้อนกลับได้ การดำเนินการนี้จะลบสินค้า "{product.name}" และรูปภาพที่เกี่ยวข้องออกจาก Google Drive อย่างถาวร
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id, product)}>
                                ลบ
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
