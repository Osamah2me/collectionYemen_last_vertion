
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../services/firebase';
// @ts-ignore
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { DB } from '../services/storage';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // مراقبة حالة المصادقة من Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          isAdmin: firebaseUser.email === 'admin@collection.com'
        };
        setUser(userData);
        localStorage.setItem('collection_session', JSON.stringify(userData));
        await DB.saveUser(userData);
      } else {
        const savedUser = localStorage.getItem('collection_session');
        if (savedUser) setUser(JSON.parse(savedUser));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = normalizedEmail === 'admin@collection.com';
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: normalizedEmail.split('@')[0],
      email: normalizedEmail,
      isAdmin: isAdmin
    };
    setUser(newUser);
    localStorage.setItem('collection_session', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const userData: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        isAdmin: firebaseUser.email === 'admin@collection.com'
      };
      setUser(userData);
      localStorage.setItem('collection_session', JSON.stringify(userData));
      await DB.saveUser(userData);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const newUser: User = { 
        id: Math.random().toString(36).substr(2, 9), 
        name, 
        email: email.toLowerCase(),
        isAdmin: email.toLowerCase() === 'admin@collection.com'
    };
    setUser(newUser);
    localStorage.setItem('collection_session', JSON.stringify(newUser));
    setIsLoading(false);
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
    localStorage.removeItem('collection_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
