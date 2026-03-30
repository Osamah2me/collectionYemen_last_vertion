
export type Language = 'en' | 'ar';

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  date: string;
  isRead: boolean;
  type: 'order' | 'welcome' | 'promo';
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  isBride?: boolean;
}

export interface LocalProduct {
  id: string;
  categoryId: string;
  brideCategoryId?: string;
  name: string;
  nameAr: string;
  price: number;
  oldPrice?: number;
  isDiscounted?: boolean;
  isBride?: boolean;
  description: string;
  descriptionAr: string;
  imageUrl: string;
  storeId?: string;
  isOffer?: boolean;
  isFlashSale?: boolean;
  sizes?: { name: string; isAvailable: boolean }[];
  colors?: { name: string; hex: string; isAvailable: boolean }[];
}

export interface Store {
  id: string;
  name: string;
  nameAr: string;
  logo: string;
  url: string;
  description: string;
  descriptionAr: string;
}

export interface CartItem {
  id: string;
  storeId: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  quantity: number;
  productUrl: string;
  isAwaitingQuote?: boolean;
  selectedSize?: string;
  selectedColor?: { name: string; hex: string };
}

export interface Translation {
  [key: string]: {
    en: string;
    ar: string;
  };
}

export enum PaymentMethod {
  CARD = 'CARD',
  KURAIMI = 'KURAIMI',
  JEEB = 'JEEB',
  ONECASH = 'ONECASH',
  TRANSFER = 'TRANSFER'
}
