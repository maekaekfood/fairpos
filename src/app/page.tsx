'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import type { Product, OrderItem } from '@/lib/types';
import Header from '@/components/Header';
import POSGrid from '@/components/POSGrid';
import OrderSummary from '@/components/OrderSummary';

export default function POSPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<{id: string, discount: number} | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const editDataJSON = sessionStorage.getItem('editTransactionData');
    if (editDataJSON) {
      try {
        const editData = JSON.parse(editDataJSON);
        if (editData.id && Array.isArray(editData.orderItems)) {
            setOrderItems(editData.orderItems);
            setEditingTransaction({ id: editData.id, discount: editData.discount || 0 });
        }
      } catch (e) {
        console.error("Failed to parse edit transaction data", e);
      }
      // Clean up session storage after loading
      sessionStorage.removeItem('editTransactionData');
    }
  }, []);

  const handleAddToOrder = (product: Product) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        // Increase quantity if product is already in the order
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new product to the order
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setOrderItems(prevItems => {
      if (newQuantity <= 0) {
        // Remove item if quantity is zero or less
        return prevItems.filter(item => item.id !== productId);
      }
      return prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    setEditingTransaction(null);
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <Header />
      <main className="flex-1 container mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2">
            <POSGrid onAddToOrder={handleAddToOrder} />
          </div>
          <div className="lg:col-span-1">
             <OrderSummary 
                orderItems={orderItems}
                onUpdateQuantity={handleUpdateQuantity}
                onClearOrder={handleClearOrder}
                onAddToOrder={handleAddToOrder}
                editingTransaction={editingTransaction}
             />
          </div>
        </div>
      </main>
    </div>
  );
}
