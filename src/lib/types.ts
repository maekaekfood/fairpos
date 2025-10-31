import type { Timestamp } from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  barcode?: string;
  imageUrl?: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  orderItems: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: Timestamp;
}
