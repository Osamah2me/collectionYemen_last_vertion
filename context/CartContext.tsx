
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CartItem } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  refreshCartPrices: () => Promise<void>;
  syncCartWithOrders: () => Promise<void>;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('collection_session');
      const savedUser = session ? JSON.parse(session) : null;
      if (savedUser) {
        const savedCart = localStorage.getItem(`cart_${savedUser.id}`);
        if (savedCart) {
          const parsed = JSON.parse(savedCart) as CartItem[];
          return Array.from(new Map(parsed.map(i => [i.id, i])).values());
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (user) {
      const savedCart = localStorage.getItem(`cart_${user.id}`);
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[];
        const unique = Array.from(new Map(parsed.map(i => [i.id, i])).values());
        setCart(unique);
      }
    } else {
      setCart([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user?.id]);

  const addToCart = (item: CartItem) => {
    if (!user) return;
    
    // Force price 0 for external items to ensure they go through pricing flow
    const isExternal = item.storeId !== 'internal' && item.storeId !== 'collection_store';
    const finalItem = isExternal ? { ...item, price: 0, isAwaitingQuote: false } : item;

    setCart(prev => {
      const existingIndex = prev.findIndex(i => 
        i.productUrl === finalItem.productUrl && 
        i.selectedSize === finalItem.selectedSize && 
        i.selectedColor?.hex === finalItem.selectedColor?.hex
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        };
        return newCart;
      }
      return [...prev, finalItem];
    });

    toast.success('تمت الإضافة إلى السلة بنجاح!');
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const syncCartWithOrders = async () => {
    if (!user) return;
    const { DB } = await import('../services/storage');
    const orders = await DB.getOrders(user.id);
    
    // Look for orders that are 'awaiting_quote' or 'quote_ready'
    const quoteOrders = orders.filter(o => o.status === 'awaiting_quote' || o.status === 'quote_ready');
    
    if (quoteOrders.length === 0) {
      // If no quote orders, ensure no items are marked as awaiting
      setCart(prev => prev.map(item => ({ ...item, isAwaitingQuote: false })));
      return;
    }

    setCart(prev => prev.map(item => {
      // Find if this item is in any of the quote orders
      for (const order of quoteOrders) {
        const orderItem = order.items.find(oi => oi.productUrl === item.productUrl);
        if (orderItem) {
          if (order.status === 'quote_ready') {
            return { ...item, price: orderItem.price, isAwaitingQuote: false };
          } else {
            return { ...item, isAwaitingQuote: true };
          }
        }
      }
      return item;
    }));
  };

  const refreshCartPrices = async () => {
    const { DB } = await import('../services/storage');
    const products = await DB.getProducts();
    
    // First sync with orders to get any admin updates
    await syncCartWithOrders();
    
    setCart(prev => prev.map(item => {
      if (item.productUrl.startsWith('local://')) {
        const productId = item.productUrl.replace('local://', '');
        const latestProduct = products.find(p => p.id === productId);
        if (latestProduct && latestProduct.price !== item.price) {
          return { ...item, price: latestProduct.price };
        }
      }
      return item;
    }));
  };

  const totalAmount = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateCartItem, removeFromCart, clearCart, refreshCartPrices, syncCartWithOrders, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
