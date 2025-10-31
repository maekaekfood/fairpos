
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, PackageOpen, FileText, Pencil } from "lucide-react";
import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import Header from "@/components/Header";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function SummaryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { firestore } = useFirebase();

  const transactionsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'transactions'), orderBy('createdAt', 'desc'))
        : null,
    [firestore]
  );
  
  const { data: transactions, isLoading: isTransactionsLoading } = useCollection<Transaction>(transactionsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handlePrintReceipt = (transaction: Transaction) => {
    sessionStorage.setItem('receiptData', JSON.stringify(transaction));
    router.push('/receipt');
  };

  const handleEditTransaction = (transaction: Transaction) => {
    sessionStorage.setItem('editTransactionData', JSON.stringify(transaction));
    router.push('/');
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
  }

  if (isUserLoading || !user) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (isTransactionsLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-4 text-muted-foreground">กำลังโหลดประวัติการขาย...</p>
        </div>
      );
    }
    
    if (!transactions || transactions.length === 0) {
       return (
          <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg">
            <PackageOpen className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-xl font-semibold text-foreground">
              ยังไม่มีประวัติการขาย
            </h2>
            <p className="mt-2 text-center text-muted-foreground">
              เมื่อมีการขายเกิดขึ้น รายการจะปรากฏที่นี่
            </p>
          </div>
       );
    }

    return (
      <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่/เวลา</TableHead>
            <TableHead>จำนวนรายการ</TableHead>
            <TableHead className="text-right">ยอดรวม</TableHead>
            <TableHead className="text-right">การกระทำ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx, index) => (
            <TableRow key={tx.id} className={cn(index === 0 && "bg-primary/10 hover:bg-primary/20")}>
              <TableCell className="font-medium">
                 {formatDate(tx.createdAt)}
                 {index === 0 && <Badge variant="default" className="ml-2">ล่าสุด</Badge>}
              </TableCell>
              <TableCell>{tx.orderItems.length} รายการ</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(tx.total)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(tx)}>
                        <Pencil className="h-4 w-4" />
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>แก้ไขรายการ</p>
                    </TooltipContent>
                  </Tooltip>
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => handlePrintReceipt(tx)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>พิมพ์ใบเสร็จ</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </TooltipProvider>
    );
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-primary"/>
              <div>
                <CardTitle className="font-headline text-2xl">สรุปยอดขาย</CardTitle>
                <CardDescription>ประวัติการทำรายการทั้งหมดและพิมพ์ใบเสร็จย้อนหลัง</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
