'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import ImageUploader from './ImageUploader';
import { Product } from '@/lib/types';
import { Textarea } from './ui/textarea';


async function uploadToGoogleDrive(
  file: File,
  fileName: string,
  accessToken: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    mimeType: file.type,
    parents: ['1H7krY1kmrY4FB4fhyGpIOLnEJZf2o4XE']
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Google Drive Upload Error:', errorData);
    throw new Error(
      `การอัปโหลดไปที่ Google Drive ล้มเหลว: ${errorData.error?.message || response.statusText}`
    );
  }

  const result = await response.json();

  await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        'role': 'reader',
        'type': 'anyone'
    })
  });

  const directLink = `https://drive.google.com/uc?id=${result.id}`;

  return { id: result.id, webViewLink: directLink };
}

async function deleteGoogleDriveFile(fileId: string, accessToken: string): Promise<void> {
  if (!fileId) return;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Drive Delete Error:', errorData);
    // Do not throw an error, just log it, as we want to proceed with DB update anyway
  }
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร' }),
  price: z.coerce.number().min(0, { message: 'ราคาต้องเป็นตัวเลขบวก' }),
  quantity: z.coerce.number().int().min(0, { message: 'จำนวนต้องเป็นเลขจำนวนเต็มบวก' }),
  barcode: z.string().optional(),
  description: z.string().optional(),
});

type EditProductFormProps = {
  product: Product;
};

export default function EditProductForm({ product }: EditProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { firestore } = useFirebase();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      barcode: product.barcode || '',
      description: product.description || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'ข้อผิดพลาด',
        description: 'ไม่สามารถใช้งาน Firestore ได้',
      });
      return;
    }

    startTransition(async () => {
      let imageUrl = product.imageUrl;
      const accessToken = window.sessionStorage.getItem('google-access-token');

      if (!accessToken) {
         toast({
            variant: 'destructive',
            title: 'ข้อผิดพลาดในการยืนยันตัวตน',
            description: 'ไม่พบ Access Token ของ Google โปรดลงชื่อเข้าใช้อีกครั้ง',
          });
        return;
      }

      try {
        if (imageFile) {
          // 1. Delete the old image from Google Drive
          if (product.imageUrl && product.imageUrl.includes('drive.google.com')) {
            const oldUrlParams = new URLSearchParams(new URL(product.imageUrl).search);
            const oldFileId = oldUrlParams.get('id');
            if (oldFileId) {
               await deleteGoogleDriveFile(oldFileId, accessToken);
            }
          }
          
          // 2. Upload the new image
          const now = new Date();
          const dateStr = format(now, 'yyyy-MM-dd');
          const timeStr = format(now, 'HH-mm-ss');
          const fileExtension = imageFile.name.split('.').pop() || 'jpg';
          const newFileName = `${dateStr}_${timeStr}_${values.name}_${values.price}.${fileExtension}`;
          const { webViewLink } = await uploadToGoogleDrive(imageFile, newFileName, accessToken);
          imageUrl = webViewLink;
        }

        // 3. Update Firestore
        const updatedProductData = {
          ...values,
          imageUrl: imageUrl, // use new or existing imageUrl
        };

        const productDocRef = doc(firestore, 'products', product.id);
        updateDocumentNonBlocking(productDocRef, updatedProductData);

        toast({
          title: 'อัปเดตสินค้าแล้ว!',
          description: `ข้อมูลของ "${values.name}" ถูกบันทึกแล้ว`,
        });

        router.push('/inventory');
      } catch (error) {
        console.error("Update failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
        toast({
            variant: "destructive",
            title: "การอัปเดตล้มเหลว",
            description: errorMessage,
        });
      }
    });
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          แก้ไขรายละเอียดสินค้า
        </CardTitle>
        <CardDescription>
          อัปเดตข้อมูลสำหรับ "{product.name}"
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
             <ImageUploader onFileChange={setImageFile} initialImageUrl={product.imageUrl} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อสินค้า</FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น ชาเขียวออร์แกนิก" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคา</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนในสต็อก</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>บาร์โค้ด</FormLabel>
                  <FormControl>
                    <Input placeholder="กรอกบาร์โค้ด (ถ้ามี)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>คำอธิบายสินค้า</FormLabel>
                    <FormControl>
                      <Textarea placeholder="รายละเอียดเกี่ยวกับสินค้า (ถ้ามี)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกการเปลี่ยนแปลง
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
