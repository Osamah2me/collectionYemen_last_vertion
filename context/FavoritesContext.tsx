
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[]; // IDs of products
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('collection_session');
      const savedUser = session ? JSON.parse(session) : null;
      const key = savedUser ? `favorites_${savedUser.id}` : 'favorites_guest';
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Update favorites when user changes
  useEffect(() => {
    const key = user ? `favorites_${user.id}` : 'favorites_guest';
    const saved = localStorage.getItem(key);
    const initialFavorites = saved ? JSON.parse(saved) : [];
    setFavorites(initialFavorites);
  }, [user?.id]);

  // Save favorites when they change
  useEffect(() => {
    const key = user ? `favorites_${user.id}` : 'favorites_guest';
    localStorage.setItem(key, JSON.stringify(favorites));
  }, [favorites, user?.id]);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(productId);
      if (isFav) {
        toast.success('تمت الإزالة من المفضلة');
        return prev.filter(id => id !== productId);
      } else {
        toast.success('تمت الإضافة إلى المفضلة');
        return [...prev, productId];
      }
    });
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
};
