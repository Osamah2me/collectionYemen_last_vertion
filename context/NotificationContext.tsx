
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification, Language } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { DB } from '../services/storage';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'date' | 'isRead'>) => void;
  markAsRead: () => void;
  requestPermission: () => Promise<void>;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !db || !db.app.options.apiKey || db.app.options.apiKey === "YOUR_API_KEY") {
      setNotifications([]);
      return;
    }

    // مراقبة فورية للإشعارات من Firestore
    const q = query(
      collection(db, "notifications"), 
      where("targetUserId", "==", user.id),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      
      setNotifications(fetchedNotifs);

      // تنبيه المتصفح للإشعارات الجديدة غير المقروءة
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && Notification.permission === 'granted') {
          const data = change.doc.data();
          if (!data.isRead) {
            new Notification(data.titleAr || data.title, {
              body: data.messageAr || data.message,
              icon: '/logo.png'
            });
          }
        }
      });
    }, (error) => {
      console.error("Notification Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const addNotification = async (n: Omit<AppNotification, 'id' | 'date' | 'isRead'>) => {
    if (!user) return;
    await DB.sendNotification({ ...n, targetUserId: user.id });
  };

  const markAsRead = async () => {
    if (!user) return;
    await DB.markNotificationsRead(user.id);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, requestPermission, permission }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
