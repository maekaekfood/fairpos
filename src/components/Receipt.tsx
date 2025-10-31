'use client';

import { OrderItem } from "@/lib/types";
import { Separator } from "./ui/separator";

interface ReceiptProps {
    orderItems: OrderItem[];
    subtotal: number;
    discount: number;
    total: number;
    createdAt?: { seconds: number, nanoseconds: number } | Date;
}

const formatCurrency = (amount: number) => {
    // Strips the currency symbol for cleaner alignment in mono font
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
};

export default function Receipt({ orderItems, subtotal, discount, total, createdAt }: ReceiptProps) {
    let transactionDate: Date;

    if (createdAt) {
      if (createdAt instanceof Date) {
        transactionDate = createdAt;
      } else if (createdAt && typeof createdAt.seconds === 'number') {
        transactionDate = new Date(createdAt.seconds * 1000);
      } else {
        transactionDate = new Date();
      }
    } else {
      transactionDate = new Date();
    }


    return (
        <div className="p-6 font-mono text-sm text-black bg-white">
            <div className="text-center space-y-1">
                <h1 className="text-lg font-semibold font-sans">ร้านแฟร์</h1>
                <p className="pt-2 text-base">ใบเสร็จรับเงิน</p>
                <p>วันที่: {transactionDate.toLocaleDateString('th-TH', { dateStyle: 'short' })} เวลา: {transactionDate.toLocaleTimeString('th-TH', { timeStyle: 'short' })} น.</p>
            </div>

            <Separator className="my-4 border-dashed border-black"/>

            <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                    <p className="flex-1 pr-2">รายการ</p>
                    <p className="w-12 text-center px-2">จำนวน</p>
                    <p className="w-20 text-right px-2">ราคา/หน่วย</p>
                    <p className="w-20 text-right">รวม</p>
                </div>
                {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                        <p className="flex-1 pr-2 break-words">{item.name}</p>
                        <p className="w-12 text-center px-2">{item.quantity}</p>
                        <p className="w-20 text-right px-2">{formatCurrency(item.price)}</p>
                        <p className="w-20 text-right">{formatCurrency(item.quantity * item.price)}</p>
                    </div>
                ))}
            </div>

            <Separator className="my-4 border-dashed border-black"/>
            
            <div className="space-y-2">
                <div className="flex justify-between">
                    <p>ยอดรวม (ก่อนลด)</p>
                    <p>{formatCurrency(subtotal)}</p>
                </div>
                <div className="flex justify-between">
                    <p>ส่วนลด</p>
                    <p>-{formatCurrency(discount)}</p>
                </div>
                <div className="flex justify-between font-bold text-lg">
                    <p>ยอดสุทธิ</p>
                    <p>{formatCurrency(total)}</p>
                </div>
            </div>

            <Separator className="my-4 border-dashed border-black"/>

            <div className="text-center mt-6 space-y-2">
                <p className="font-sans text-base pt-2">ขอบคุณที่ใช้บริการ</p>
                <div className="text-xs pt-2">
                    <p>ร้านแฟร์</p>
                    <p>173/1 หมู่ที่ 2 ตำบลจันดี อำเภอฉวาง</p>
                    <p>จังหวัดนครศรีธรรมราช 80250</p>
                    <p>โทร: 081-535-6737</p>
                </div>
            </div>
        </div>
    );
}
