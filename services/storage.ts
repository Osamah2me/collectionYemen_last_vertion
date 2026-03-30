
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  addDoc
} from "firebase/firestore";
import { db, storage as firebaseStorageInstance, ref, uploadString, getDownloadURL } from "./firebase";
import { User, CartItem, Category, LocalProduct, AppNotification } from '../types';

export type OrderStatus = 'pending' | 'purchased' | 'shipped' | 'yemen' | 'delivery' | 'completed' | 'cancelled' | 'awaiting_quote' | 'quote_ready';

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userAddress?: string;
  items: CartItem[];
  total: number;
  date: string;
  status: OrderStatus;
  paymentMethod: string;
  screenshotUrl?: string;
}

export interface AdvancedStats {
  userCount: number;
  orderCount: number;
  totalSales: number;
  avgOrderValue: number;
  topProducts: { name: string, count: number, revenue: number }[];
  storeDistribution: { storeId: string, count: number, percentage: number }[];
}

const isFirebaseReady = () => {
  try {
    return !!db && !!db.app.options.apiKey && db.app.options.apiKey !== "YOUR_API_KEY";
  } catch {
    return false;
  }
};

const persistToLocal = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      const reducedData = data.slice(Math.floor(data.length * 0.2));
      localStorage.setItem(key, JSON.stringify(reducedData));
    }
  }
};

async function safeExecute<T>(firebaseOp: () => Promise<T>, localStorageOp: () => T | Promise<T>): Promise<T> {
  if (!isFirebaseReady()) return await localStorageOp();
  try {
    return await firebaseOp();
  } catch (error: any) {
    console.warn("Firebase Fallback:", error.message);
    return await localStorageOp();
  }
}

export const DB = {
  // --- Notifications ---
  sendNotification: async (notif: Omit<AppNotification, 'id' | 'isRead' | 'date'> & { targetUserId: string }) => {
    return safeExecute(
      async () => {
        const notifCol = collection(db, "notifications");
        await addDoc(notifCol, {
          ...notif,
          isRead: false,
          date: new Date().toISOString()
        });
      },
      () => {
        const key = `notifications_${notif.targetUserId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        persistToLocal(key, [{ ...notif, id: Math.random().toString(36).substr(2, 9), isRead: false, date: new Date().toISOString() }, ...existing]);
      }
    );
  },

  markNotificationsRead: async (userId: string) => {
    if (!isFirebaseReady()) return;
    const q = query(collection(db, "notifications"), where("targetUserId", "==", userId), where("isRead", "==", false));
    const snap = await getDocs(q);
    const batch = snap.docs.map(d => updateDoc(d.ref, { isRead: true }));
    await Promise.all(batch);
  },

  // --- Orders ---
  saveOrder: async (order: Order) => {
    return safeExecute(
      async () => await setDoc(doc(db, "orders", order.id), order),
      () => {
        const orders = JSON.parse(localStorage.getItem('collection_orders') || '[]');
        const updated = orders.some((o: any) => o.id === order.id)
          ? orders.map((o: any) => o.id === order.id ? order : o)
          : [...orders, order];
        persistToLocal('collection_orders', updated);
      }
    );
  },
  getOrders: async (userId?: string): Promise<Order[]> => {
    return safeExecute(
      async () => {
        const ordersCol = collection(db, "orders");
        const q = userId 
          ? query(ordersCol, where("userId", "==", userId), orderBy("date", "desc"))
          : query(ordersCol, orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => doc.data() as Order);
        // Deduplicate by ID
        return Array.from(new Map(orders.map(o => [o.id, o])).values());
      },
      () => {
        const orders = JSON.parse(localStorage.getItem('collection_orders') || '[]');
        const filtered = userId ? orders.filter((o: any) => o.userId === userId) : orders;
        const sorted = filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Deduplicate by ID
        return Array.from(new Map(sorted.map((o: any) => [o.id, o])).values()) as Order[];
      }
    );
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    return safeExecute(
      async () => await updateDoc(doc(db, "orders", orderId), { status }),
      () => {
        const orders = JSON.parse(localStorage.getItem('collection_orders') || '[]');
        const updated = orders.map((o: any) => o.id === orderId ? {...o, status} : o);
        persistToLocal('collection_orders', updated);
      }
    );
  },
  updateOrderTotal: async (orderId: string, total: number) => {
    return safeExecute(
      async () => await updateDoc(doc(db, "orders", orderId), { total }),
      () => {
        const orders = JSON.parse(localStorage.getItem('collection_orders') || '[]');
        const updated = orders.map((o: any) => o.id === orderId ? {...o, total} : o);
        persistToLocal('collection_orders', updated);
      }
    );
  },

  // --- Users ---
  getUser: async (uid: string): Promise<User | null> => {
    return safeExecute(
      async () => {
        const docSnap = await getDoc(doc(db, "users", uid));
        return docSnap.exists() ? (docSnap.data() as User) : null;
      },
      () => JSON.parse(localStorage.getItem('collection_users') || '[]').find((u:any)=>u.id===uid)
    );
  },
  saveUser: async (user: User) => {
    return safeExecute(
      async () => await setDoc(doc(db, "users", user.id), user, { merge: true }),
      () => {
        const users = JSON.parse(localStorage.getItem('collection_users') || '[]');
        persistToLocal('collection_users', [...users.filter((u:any)=>u.id!==user.id), user]);
      }
    );
  },

  // --- Catalog ---
  getCategories: async () => safeExecute(
    async () => {
      const snap = await getDocs(collection(db, "categories"));
      const cats = snap.docs.map(d => d.data() as Category);
      return Array.from(new Map(cats.map(c => [c.id, c])).values());
    }, 
    () => {
      const cats = JSON.parse(localStorage.getItem('collection_cats') || '[]');
      return Array.from(new Map(cats.map((c: any) => [c.id, c])).values()) as Category[];
    }
  ),
  getProducts: async () => safeExecute(
    async () => {
      const snap = await getDocs(collection(db, "products"));
      const prods = snap.docs.map(d => d.data() as LocalProduct);
      return Array.from(new Map(prods.map(p => [p.id, p])).values());
    }, 
    () => {
      const prods = JSON.parse(localStorage.getItem('collection_prods') || '[]');
      return Array.from(new Map(prods.map((p: any) => [p.id, p])).values()) as LocalProduct[];
    }
  ),
  saveProduct: async (p: LocalProduct) => safeExecute(async()=>await setDoc(doc(db, "products", p.id), p), ()=>{
    const ps = JSON.parse(localStorage.getItem('collection_prods') || '[]');
    persistToLocal('collection_prods', [...ps.filter((x:any)=>x.id!==p.id), p]);
  }),
  deleteProduct: async (id: string) => safeExecute(async()=>await deleteDoc(doc(db, "products", id)), ()=>{
    const ps = JSON.parse(localStorage.getItem('collection_prods') || '[]');
    persistToLocal('collection_prods', ps.filter((x:any)=>x.id!==id));
  }),
  saveCategory: async (c: Category) => safeExecute(async()=>await setDoc(doc(db, "categories", c.id), c), ()=>{
    const cs = JSON.parse(localStorage.getItem('collection_cats') || '[]');
    persistToLocal('collection_cats', [...cs.filter((x:any)=>x.id!==c.id), c]);
  }),
  deleteCategory: async (id: string) => safeExecute(async()=>await deleteDoc(doc(db, "categories", id)), ()=>{
    const cs = JSON.parse(localStorage.getItem('collection_cats') || '[]');
    persistToLocal('collection_cats', cs.filter((x:any)=>x.id!==id));
  }),

  // --- Analytics ---
  getAdvancedStats: async (): Promise<AdvancedStats> => {
    return safeExecute(
      async () => {
        const os = await DB.getOrders();
        const us = await getDocs(collection(db, "users"));
        return DB._calculateStats(os, us.size);
      },
      async () => {
        const os = await DB.getOrders();
        const us = JSON.parse(localStorage.getItem('collection_users') || '[]');
        return DB._calculateStats(os, us.length);
      }
    );
  },

  _calculateStats: (orders: Order[], userCount: number): AdvancedStats => {
    const totalSales = orders.reduce((acc, curr) => acc + curr.total, 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    // Top Products
    const productMap: Record<string, { count: number, revenue: number }> = {};
    const storeMap: Record<string, number> = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const prodId = item.name; // Using name as key for simplicity in stats
        if (!productMap[prodId]) productMap[prodId] = { count: 0, revenue: 0 };
        productMap[prodId].count += item.quantity;
        productMap[prodId].revenue += (item.price * item.quantity);

        const sId = item.storeId || 'unknown';
        storeMap[sId] = (storeMap[sId] || 0) + 1;
      });
    });

    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const storeDistribution = Object.entries(storeMap)
      .map(([storeId, count]) => ({ 
        storeId, 
        count, 
        percentage: (count / orders.reduce((a, b) => a + b.items.length, 0)) * 100 
      }))
      .sort((a, b) => b.count - a.count);

    return { userCount, orderCount, totalSales, avgOrderValue, topProducts, storeDistribution };
  },

  // --- Utils ---
  uploadProductImage: async (productId: string, base64: string) => safeExecute(async () => {
    const sRef = ref(firebaseStorageInstance, `products/${productId}.jpg`);
    await uploadString(sRef, base64, 'data_url');
    return await getDownloadURL(sRef);
  }, () => base64),
  
  getStats: async () => DB.getAdvancedStats(),
  getOrderById: async (id: string) => safeExecute(async()=>(await getDoc(doc(db, "orders", id))).data() as Order, ()=>JSON.parse(localStorage.getItem('collection_orders') || '[]').find((o:any)=>o.id===id)),

  // --- Settings ---
  getSettings: async () => safeExecute(
    async () => {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      return docSnap.exists() ? docSnap.data() : {};
    },
    () => JSON.parse(localStorage.getItem('collection_settings') || '{}')
  ),
  saveSettings: async (settings: any) => safeExecute(
    async () => await setDoc(doc(db, "settings", "global"), settings, { merge: true }),
    () => {
      const existing = JSON.parse(localStorage.getItem('collection_settings') || '{}');
      const updated = { ...existing, ...settings };
      localStorage.setItem('collection_settings', JSON.stringify(updated));
    }
  )
};
