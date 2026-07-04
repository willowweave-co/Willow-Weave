"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "ww-cart-v1";

interface CartContextValue {
  items: CartItem[];
  /** total item count (sum of quantities) */
  count: number;
  subtotal: number;
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* corrupted cart — start fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full/blocked — cart still works in-memory */
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.variantId === item.variantId);
      if (existing) {
        const next = Math.min(existing.quantity + quantity, item.maxStock);
        return prev.map((x) =>
          x.variantId === item.variantId ? { ...x, ...item, quantity: next } : x
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.maxStock) }];
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((x) => x.variantId !== variantId)
        : prev.map((x) =>
            x.variantId === variantId
              ? { ...x, quantity: Math.min(quantity, x.maxStock) }
              : x
          )
    );
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((x) => x.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, x) => n + x.quantity, 0);
    const subtotal = items.reduce((n, x) => n + x.unitPrice * x.quantity, 0);
    return {
      items,
      count,
      subtotal,
      hydrated,
      isOpen,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    };
  }, [items, hydrated, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
