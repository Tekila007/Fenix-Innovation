import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface Service {
  id: number;
  nome: string;
  preco: number;
  descricao: string;
  categoria: string;
  image?: string;
  is_promo?: boolean;
}

export interface CartItem extends Service {
  quantidade: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (service: Service) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
  applyCoupon: (code: string, percentage: number) => void;
  removeCoupon: () => void;
  couponCode: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    if (!saved || saved === 'undefined') return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing cart from localStorage', e);
      return [];
    }
  });
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (service: Service) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.id === service.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { ...service, quantidade: 1 }];
    });
    toast.success(`${service.nome} adicionado ao carrinho!`);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, quantidade: quantity } : item));
  };

  const clearCart = () => {
    setCart([]);
    setCouponCode(null);
    setCouponDiscount(0);
  };

  const applyCoupon = (code: string, percentage: number) => {
    setCouponCode(code);
    setCouponDiscount(percentage / 100);
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setCouponDiscount(0);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);

  let discountPercent = 0;
  if (couponDiscount > 0) {
    discountPercent = couponDiscount;
  } else if (totalItems > 10 && subtotal > 100000) {
    discountPercent = 0.40;
  } else if (totalItems > 5 && subtotal > 30000) {
    discountPercent = 0.20;
  } else if (totalItems >= 3 && subtotal > 20000) {
    discountPercent = 0.10;
  }

  const discount = subtotal * discountPercent;
  const total = subtotal - discount;

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, discount, discountPercent, total, applyCoupon, removeCoupon, couponCode }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const formatAOA = (value: number) => {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value);
};
