
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, Timestamp } from 'firebase/firestore';

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
import { format } from 'date-fns';

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'ชื่อสินค้าต้องมีอย่างน้อย 2 ตัวอักษร' }),
  price: z.coerce.number().min(0, { message: 'ราคาต้องเป็นตัวเลขบวก' }),
  barcode: z.string().optional(),
});

type AddProductFormProps = {
  hasBarcode: boolean;
  scannedBarcode: string;
};

// Function to upload to Google Drive
async function uploadToGoogleDrive(
  file: File,
  fileName: string,
  accessToken: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: fileName,
    mimeType: file.type,
    // Specify the folder ID to upload to
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

  // Make the file publicly readable
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

  // Construct a direct-viewable link.
  const directLink = `https://drive.google.com/uc?id=${result.id}`;


  return { id: result.id, webViewLink: directLink };
}


export default function AddProductForm({
  hasBarcode,
  scannedBarcode,
}: AddProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { firestore } = useFirebase();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      price: 0,
      barcode: hasBarcode ? scannedBarcode : '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'ข้อผิดพลาด',
        description: 'ไม่สามารถใช้งาน Firestore ได้ โปรดลองอีกครั้งในภายหลัง',
      });
      return;
    }
    if (!imageFile) {
        toast({
            variant: 'destructive',
            title: 'จำเป็นต้องมีรูปภาพ',
            description: 'กรุณาเลือกรูปภาพสำหรับสินค้า',
        });
        return;
    }


    startTransition(async () => {
      let imageUrl = '';
      if (imageFile) {
        try {
          const accessToken = window.sessionStorage.getItem('google-access-token');

          if (!accessToken) {
            throw new Error('ไม่พบ Access Token ของ Google OAuth โปรดลงชื่อเข้าใช้อีกครั้ง');
          }
          
          const now = new Date();
          const dateStr = format(now, 'yyyy-MM-dd');
          const timeStr = format(now, 'HH-mm-ss');
          const fileExtension = imageFile.name.split('.').pop() || 'jpg';
          const newFileName = `${dateStr}_${timeStr}_${values.name}_${values.price}.${fileExtension}`;


          const { webViewLink } = await uploadToGoogleDrive(imageFile, newFileName, accessToken);
          imageUrl = webViewLink;
        } catch (error) {
          console.error('Image Upload Failed:', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'ไม่สามารถอัปโหลดรูปภาพสินค้าได้ โปรดลองอีกครั้ง';
          toast({
            variant: 'destructive',
            title: 'การอัปโหลดรูปภาพล้มเหลว',
            description: errorMessage,
          });
          return;
        }
      }

      const newProductData = {
        ...values,
        imageUrl,
        description: '',
        quantity: 1,
        createdAt: Timestamp.now(),
      };

      const productsCollectionRef = collection(firestore, 'products');

      addDocumentNonBlocking(productsCollectionRef, newProductData);

      toast({
        title: 'เพิ่มสินค้าแล้ว!',
        description: `"${values.name}" กำลังถูกเพิ่มไปยังสินค้าคงคลังของคุณ`,
      });

      router.push('/');
    });
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          รายละเอียดสินค้า
        </CardTitle>
        <CardDescription>
          กรอกข้อมูลสำหรับสินค้าใหม่ของคุณ
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
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
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <ImageUploader onFileChange={setImageFile} />

            {hasBarcode && (
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บาร์โค้ด</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="บาร์โค้ดที่สแกน"
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormDescription>
                      บาร์โค้ดนี้ถูกตรวจพบโดยอัตโนมัติ
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {!hasBarcode && (
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>บาร์โค้ด (ไม่จำเป็นต้องกรอก)</FormLabel>
                    <FormControl>
                      <Input placeholder="กรอกบาร์โค้ดด้วยตนเอง" {...field} />
                    </FormControl>
                    <FormDescription>
                      คุณสามารถกรอกบาร์โค้ดด้วยตนเองหากมี
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              เพิ่มสินค้าเข้าสต็อก
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
