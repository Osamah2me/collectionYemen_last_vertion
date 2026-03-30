
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Language, PaymentMethod, Category, LocalProduct } from '../types';
import { TRANSLATIONS, STORES, BRIDE_CATEGORIES } from '../constants';
import { DB, Order, OrderStatus, AdvancedStats } from '../services/storage';

interface Props { lang: Language; }

const AdminDashboard: React.FC<Props> = ({ lang }) => {
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'stats' | 'catalog' | 'settings'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pricing' | 'external' | 'completed'>('all');
  const [catalogSubTab, setCatalogSubTab] = useState<'categories' | 'products'>('categories');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBannerIdx, setUploadingBannerIdx] = useState<number | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingBannerIdx === null) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const newBanners = [...(settings.banners || [])];
      newBanners[uploadingBannerIdx] = reader.result as string;
      setSettings({ ...settings, banners: newBanners });
      setIsUploading(false);
      setUploadingBannerIdx(null);
    };
    reader.readAsDataURL(file);
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<LocalProduct> | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  const fetchData = async () => {
    const s = await DB.getAdvancedStats();
    const o = await DB.getOrders();
    const c = await DB.getCategories();
    const p = await DB.getProducts();
    const sett = await DB.getSettings();
    
    setOrders(o);
    setStats(s);
    setCategories(c);
    setProducts(p);
    setSettings(sett);
  };

  useEffect(() => { fetchData(); }, []);

  const [editingOrderPrice, setEditingOrderPrice] = useState<{id: string, total: number} | null>(null);
  const [editingItemsOrderId, setEditingItemsOrderId] = useState<string | null>(null);
  const [tempItems, setTempItems] = useState<any[]>([]);

  const handlePriceUpdate = async () => {
    if (!editingOrderPrice) return;
    try {
      const order = orders.find(o => o.id === editingOrderPrice.id);
      if (!order) return;

      let newStatus = order.status;
      if (order.status === 'awaiting_quote') {
        newStatus = 'quote_ready';
      }

      // Update items as well to ensure customer sees the price on items
      const updatedItems = [...order.items];
      if (updatedItems.length === 1) {
        updatedItems[0] = { ...updatedItems[0], price: editingOrderPrice.total };
      } else if (updatedItems.length > 0) {
        // If multiple items, we might not know how to distribute, 
        // but setting them to something > 0 helps the UI.
        // For now, let's just update the first one if they are all 0
        if (updatedItems.every(i => i.price === 0)) {
          updatedItems[0] = { ...updatedItems[0], price: editingOrderPrice.total };
        }
      }

      const updatedOrder = { 
        ...order, 
        total: editingOrderPrice.total, 
        status: newStatus,
        items: updatedItems 
      };
      
      await DB.saveOrder(updatedOrder);
      
      await DB.sendNotification({
        targetUserId: order.userId,
        title: newStatus === 'quote_ready' ? 'Quote Ready!' : 'Price Updated',
        titleAr: newStatus === 'quote_ready' ? 'التسعيرة جاهزة!' : 'تحديث السعر',
        message: newStatus === 'quote_ready'
          ? `The quote for your order #${order.id} is ready. Total: ${editingOrderPrice.total} SAR. Please proceed with payment.`
          : `The price for your order #${order.id} has been set to ${editingOrderPrice.total} SAR.`,
        messageAr: newStatus === 'quote_ready'
          ? `التسعيرة لطلبك رقم #${order.id} جاهزة الآن. المجموع: ${editingOrderPrice.total} ريال. يرجى إتمام عملية الدفع.`
          : `تم تحديد السعر لطلبك رقم #${order.id} بمبلغ ${editingOrderPrice.total} ريال.`,
        type: 'order'
      });

      toast.success(lang === 'ar' ? 'تم تحديث السعر بنجاح' : 'Price updated successfully');
      setEditingOrderPrice(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تحديث السعر' : 'Error updating price');
    }
  };

  const handleSaveItems = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newTotal = tempItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      let newStatus = order.status;
      
      // If saving items for an order awaiting quote, automatically move it to quote_ready
      if (order.status === 'awaiting_quote') {
        newStatus = 'quote_ready';
      }

      const updatedOrder = { ...order, items: tempItems, total: newTotal, status: newStatus };
      
      await DB.saveOrder(updatedOrder);
      
      await DB.sendNotification({
        targetUserId: order.userId,
        title: newStatus === 'quote_ready' ? 'Quote Ready!' : 'Order Details Updated',
        titleAr: newStatus === 'quote_ready' ? 'التسعيرة جاهزة!' : 'تحديث تفاصيل الطلب',
        message: newStatus === 'quote_ready' 
          ? `The quote for your order #${order.id} is ready. Total: ${newTotal} SAR. Please proceed with payment.`
          : `The items and total price for your order #${order.id} have been updated. New Total: ${newTotal} SAR.`,
        messageAr: newStatus === 'quote_ready'
          ? `التسعيرة لطلبك رقم #${order.id} جاهزة الآن. المجموع: ${newTotal} ريال. يرجى إتمام عملية الدفع.`
          : `تم تحديث تفاصيل وأسعار الطلب رقم #${order.id}. المجموع الجديد: ${newTotal} ريال.`,
        type: 'order'
      });

      toast.success(lang === 'ar' ? 'تم تحديث الطلب بنجاح' : 'Order updated successfully');
      setEditingItemsOrderId(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء التحديث' : 'Error updating order');
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await DB.saveSettings(settings);
      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    await DB.updateOrderStatus(order.id, newStatus);
    
    // إرسال إشعار للعميل
    const statusMap: Record<OrderStatus, { en: string, ar: string }> = {
      pending: { en: 'Reviewing', ar: 'قيد المراجعة' },
      purchased: { en: 'Purchased', ar: 'تم الشراء' },
      shipped: { en: 'Shipped', ar: 'تم الشحن دولياً' },
      yemen: { en: 'In Yemen', ar: 'وصل اليمن' },
      delivery: { en: 'Delivering', ar: 'قيد التوصيل' },
      completed: { en: 'Delivered', ar: 'تم التسليم' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
      awaiting_quote: { en: 'Awaiting Quote', ar: 'بانتظار التسعير' },
      quote_ready: { en: 'Quote Ready', ar: 'تم التسعير' }
    };

    await DB.sendNotification({
      targetUserId: order.userId,
      title: 'Order Update',
      titleAr: 'تحديث حالة الطلب',
      message: `Your order #${order.id} status is now: ${statusMap[newStatus].en}`,
      messageAr: `حالة طلبك رقم #${order.id} أصبحت الآن: ${statusMap[newStatus].ar}`,
      type: 'order'
    });

    fetchData();
  };

  const isEnglish = (str: string) => !/[\u0600-\u06FF]/.test(str);

  const isCategoryValid = !!(
    editingCategory?.name && 
    isEnglish(editingCategory.name) &&
    editingCategory?.nameAr
  );
  
  const isProductValid = !!(
    editingProduct?.name && 
    isEnglish(editingProduct.name) &&
    editingProduct?.nameAr &&
    (editingProduct?.isBride ? !!editingProduct?.brideCategoryId : !!editingProduct?.categoryId) && 
    editingProduct?.imageUrl
  );

  const saveCategory = async () => {
    if (!isCategoryValid) return;
    const isEdit = !!editingCategory!.id;
    const cat: Category = {
      id: editingCategory!.id || Math.random().toString(36).substr(2, 9),
      name: editingCategory!.name!,
      nameAr: editingCategory!.nameAr!,
      icon: editingCategory!.icon || 'fa-tag',
      isBride: editingCategory!.isBride || false
    };
    await DB.saveCategory(cat);
    toast.success(lang === 'ar' 
      ? (isEdit ? 'تم تعديل القسم بنجاح' : 'تم إضافة القسم بنجاح') 
      : (isEdit ? 'Category updated successfully' : 'Category added successfully')
    );
    setEditingCategory(null);
    fetchData();
  };

  const saveProduct = async () => {
    if (!isProductValid) return;
    const isEdit = !!editingProduct!.id;
    const prod: LocalProduct = {
      id: editingProduct!.id || Math.random().toString(36).substr(2, 9),
      categoryId: editingProduct!.categoryId || 'bride',
      brideCategoryId: editingProduct!.brideCategoryId,
      name: editingProduct!.name!,
      nameAr: editingProduct!.nameAr || editingProduct!.name!,
      price: editingProduct!.price || 0,
      oldPrice: editingProduct!.oldPrice || 0,
      isDiscounted: editingProduct!.isDiscounted || false,
      isBride: editingProduct!.isBride || false,
      description: editingProduct!.description || '',
      descriptionAr: editingProduct!.descriptionAr || '',
      imageUrl: editingProduct!.imageUrl!,
      isOffer: editingProduct!.isOffer || false,
      isFlashSale: editingProduct!.isFlashSale || false,
      sizes: editingProduct!.sizes || [],
      colors: editingProduct!.colors || [],
      storeId: 'internal'
    };
    await DB.saveProduct(prod);
    toast.success(lang === 'ar' 
      ? (isEdit ? 'تم تعديل المنتج بنجاح' : 'تم إضافة المنتج بنجاح') 
      : (isEdit ? 'Product updated successfully' : 'Product added successfully')
    );
    setEditingProduct(null);
    fetchData();
  };

  const statusList: OrderStatus[] = ['awaiting_quote', 'quote_ready', 'pending', 'purchased', 'shipped', 'yemen', 'delivery', 'completed', 'cancelled'];
  
  const getStoreName = (id: string) => {
    if (id === 'internal' || id === 'collection_store') return lang === 'ar' ? 'متجر كوليكشن' : 'Collection Store';
    return STORES.find(s => s.id === id)?.[lang === 'ar' ? 'nameAr' : 'name'] || id;
  };

  return (
    <div className="animate-fade-in space-y-8 pb-24">
      {selectedReceipt && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedReceipt(null)}>
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
             <img src={selectedReceipt} className="w-full h-auto max-h-[80vh] object-contain" alt="Receipt" />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{t('adminDashboard')}</h2>
          <p className="text-gray-400 dark:text-slate-500 font-bold text-sm tracking-widest uppercase mt-1">Unified Data Hub</p>
        </div>
        <div className="flex bg-white dark:bg-slate-900/50 p-1.5 rounded-2xl shadow-sm border border-[#e0e0e0] dark:border-white/10 overflow-x-auto no-scrollbar max-w-full">
           <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-[#1a2b4c] dark:bg-[#c4a76d] text-[#c4a76d] dark:text-[#1a2b4c]' : 'text-[#7a7a7a]'}`}>
             {t('manageOrders')}
           </button>
           <button onClick={() => setActiveTab('catalog')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'catalog' ? 'bg-[#1a2b4c] dark:bg-[#c4a76d] text-[#c4a76d] dark:text-[#1a2b4c]' : 'text-[#7a7a7a]'}`}>
             {lang === 'en' ? 'Catalog' : 'المتجر'}
           </button>
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-[#1a2b4c] dark:bg-[#c4a76d] text-[#c4a76d] dark:text-[#1a2b4c]' : 'text-[#7a7a7a]'}`}>
             {lang === 'en' ? 'Analytics' : 'التحليلات'}
           </button>
           <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-[#1a2b4c] dark:bg-[#c4a76d] text-[#c4a76d] dark:text-[#1a2b4c]' : 'text-[#7a7a7a]'}`}>
             {lang === 'en' ? 'Settings' : 'الإعدادات'}
           </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="flex justify-end h-0 opacity-0 pointer-events-none">
          {/* Manual order button removed as per user request */}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="space-y-8 animate-slide-up">
           {/* Primary Cards */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><i className="fa-solid fa-users text-6xl text-[#1a2b4c]"></i></div>
                <h4 className="text-[10px] text-[#7a7a7a] dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-2">المستخدمين</h4>
                <p className="text-4xl font-black text-[#1a2b4c] dark:text-white">{stats.userCount}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><i className="fa-solid fa-box text-6xl text-[#1a2b4c]"></i></div>
                <h4 className="text-[10px] text-[#7a7a7a] dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-2">الطلبات</h4>
                <p className="text-4xl font-black text-[#1a2b4c] dark:text-white">{stats.orderCount}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><i className="fa-solid fa-chart-line text-6xl text-[#1a2b4c]"></i></div>
                <h4 className="text-[10px] text-[#7a7a7a] dark:text-slate-500 font-black uppercase tracking-[0.2em] mb-2">متوسط الطلب</h4>
                <p className="text-3xl font-black text-[#c4a76d]">{stats.avgOrderValue.toFixed(1)} <span className="text-xs uppercase">SAR</span></p>
              </div>
              <div className="bg-[#1a2b4c] p-8 rounded-[2.5rem] shadow-2xl border-b-8 border-[#c4a76d] text-center">
                <h4 className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">إجمالي المبيعات</h4>
                <p className="text-4xl font-black text-[#c4a76d] tracking-tighter">{stats.totalSales.toFixed(0)} <span className="text-xs uppercase">SAR</span></p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Products Chart */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-widest">{lang === 'ar' ? 'المنتجات الأكثر مبيعاً' : 'Top Selling Products'}</h4>
                  <i className="fa-solid fa-trophy text-[#C5A028] text-xl"></i>
                </div>
                <div className="space-y-6">
                  {stats.topProducts.map((p, i) => {
                    const maxCount = Math.max(...stats.topProducts.map(x => x.count));
                    const width = (p.count / maxCount) * 100;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[11px] font-black text-gray-900 dark:text-white truncate max-w-[200px]">{p.name}</span>
                          <span className="text-[10px] font-black text-[#C5A028] uppercase">{p.count} Qty</span>
                        </div>
                        <div className="h-4 bg-gray-50 dark:bg-slate-800 rounded-full overflow-hidden border border-gray-100 dark:border-white/5">
                          <div 
                            className="h-full bg-gradient-to-r from-[#C5A028] to-[#F5E6AD] rounded-full transition-all duration-1000"
                            style={{ width: `${width}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Store Distribution */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-widest">{lang === 'ar' ? 'توزيع المتاجر العالمية' : 'Global Stores Distribution'}</h4>
                  <i className="fa-solid fa-chart-pie text-blue-500 text-xl"></i>
                </div>
                <div className="grid gap-4">
                  {stats.storeDistribution.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-[10px] text-[#C5A028] border border-[#C5A028]/20 uppercase">
                        {s.storeId.slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase">{getStoreName(s.storeId)}</span>
                          <span className="text-[10px] font-black text-gray-400">{s.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.percentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6 animate-slide-up">
          {/* Order Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
              <p className="text-xl font-black text-[#1a2b4c] dark:text-white">{orders.length}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/5 p-4 rounded-2xl border border-amber-100 dark:border-amber-500/10">
              <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Needs Pricing</p>
              <p className="text-xl font-black text-amber-600">{orders.filter(o => o.status === 'awaiting_quote').length}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/10">
              <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">External Orders</p>
              <p className="text-xl font-black text-blue-600">{orders.filter(o => o.items.some(i => i.productUrl)).length}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-500/5 p-4 rounded-2xl border border-green-100 dark:border-green-500/10">
              <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Completed</p>
              <p className="text-xl font-black text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text" 
                placeholder={lang === 'ar' ? 'البحث برقم الطلب أو اسم العميل...' : 'Search by order ID or customer name...'}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-[#c4a76d] transition-all text-sm"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
              {(['all', 'pricing', 'external', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    orderFilter === f 
                      ? 'bg-[#1a2b4c] text-[#c4a76d] border-[#1a2b4c]' 
                      : 'bg-white dark:bg-slate-900 text-gray-400 border-gray-100 dark:border-white/5 hover:border-[#c4a76d]'
                  }`}
                >
                  {f === 'all' ? (lang === 'ar' ? 'الكل' : 'All') :
                   f === 'pricing' ? (lang === 'ar' ? 'يحتاج تسعير' : 'Pricing') :
                   f === 'external' ? (lang === 'ar' ? 'طلبات خارجية' : 'External') :
                   (lang === 'ar' ? 'مكتمل' : 'Completed')}
                </button>
              ))}
            </div>
          </div>

          {orders
            .filter(o => {
              const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                                    (o.userName || '').toLowerCase().includes(orderSearch.toLowerCase());
              const matchesFilter = 
                orderFilter === 'all' ? true :
                orderFilter === 'pricing' ? o.status === 'awaiting_quote' :
                orderFilter === 'external' ? o.items.some(i => i.productUrl) :
                orderFilter === 'completed' ? o.status === 'completed' : true;
              return matchesSearch && matchesFilter;
            })
            .map(order => (
            <div key={order.id} className={`p-6 md:p-8 rounded-[2.5rem] shadow-sm border flex flex-col lg:flex-row gap-8 lg:items-center justify-between hover:shadow-xl transition-all relative overflow-hidden ${order.status === 'awaiting_quote' ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 ring-2 ring-amber-500/10' : 'bg-white dark:bg-slate-900 border-[#e0e0e0] dark:border-white/5'}`}>
              {order.status === 'awaiting_quote' && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm z-10">
                  {lang === 'ar' ? 'يحتاج تسعير' : 'Needs Pricing'}
                </div>
              )}
              {order.items.some(i => i.productUrl) && (
                <div className="absolute top-0 left-0 bg-blue-600 text-white px-4 py-1 text-[8px] font-black uppercase tracking-widest rounded-br-xl shadow-sm z-10">
                  {lang === 'ar' ? 'طلب خارجي' : 'External Order'}
                </div>
              )}
              
              <div className="flex-1 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-16 h-16 bg-[#f9f7f2] dark:bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-[#c4a76d] font-black text-2xl shadow-inner uppercase shrink-0 border border-[#e0e0e0] dark:border-white/5">
                   {order.id.slice(0, 2)}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-[#7a7a7a] dark:text-slate-500 font-black uppercase tracking-widest">ORDER #{order.id}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(order.id);
                          toast.success(lang === 'ar' ? 'تم نسخ رقم الطلب' : 'Order ID copied');
                        }}
                        className="text-slate-400 hover:text-[#c4a76d] transition-colors"
                      >
                        <i className="fa-solid fa-copy text-[10px]"></i>
                      </button>
                      {order.status === 'quote_ready' && <span className="text-[8px] bg-green-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Quote Sent</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      {editingOrderPrice?.id === order.id ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-[#c4a76d] shadow-lg animate-scale-in">
                          <input 
                            type="number" 
                            className="w-24 bg-transparent border-none outline-none p-1 text-xs font-black"
                            value={editingOrderPrice.total}
                            autoFocus
                            onChange={e => setEditingOrderPrice({...editingOrderPrice, total: Number(e.target.value)})}
                          />
                          <button onClick={handlePriceUpdate} className="bg-[#1a2b4c] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-[#2a3b5c]">Save</button>
                          <button onClick={() => setEditingOrderPrice(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><i className="fa-solid fa-times"></i></button>
                        </div>
                      ) : (
                        <h4 className="font-black text-[#1a2b4c] dark:text-white text-xl flex items-center gap-2">
                          {order.total.toFixed(2)} SAR
                          <button 
                            onClick={() => {
                              if (order.items.length > 1) {
                                setEditingItemsOrderId(order.id);
                                setTempItems([...order.items]);
                              } else {
                                setEditingOrderPrice({id: order.id, total: order.total});
                              }
                            }} 
                            className={`text-[10px] px-3 py-1 rounded-full uppercase font-bold transition-all ${order.status === 'awaiting_quote' ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600' : 'text-[#c4a76d] hover:underline'}`}
                          >
                            {order.status === 'awaiting_quote' ? (lang === 'ar' ? 'تسعير الآن' : 'Price Now') : (lang === 'ar' ? 'تعديل' : 'Edit')}
                          </button>
                        </h4>
                      )}
                    </div>
                    <p className="text-[10px] text-[#7a7a7a] dark:text-slate-500 font-medium mt-1">
                      {order.userName} • {new Date(order.date).toLocaleString()}
                    </p>
                  </div>

                  {/* Contact Info */}
                  {(order.userPhone || order.userAddress) && (
                    <div className="flex flex-col gap-1 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      {order.userPhone && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#1a2b4c] dark:text-[#c4a76d]">
                          <i className="fa-solid fa-phone w-4"></i>
                          <span dir="ltr">{order.userPhone}</span>
                        </div>
                      )}
                      {order.userAddress && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          <i className="fa-solid fa-location-dot w-4"></i>
                          <span>{order.userAddress}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* External Links */}
                  {order.items.some(i => i.productUrl) && (
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => item.productUrl && (
                        <a 
                          key={idx} 
                          href={item.productUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-2 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 transition-all"
                        >
                          <i className="fa-solid fa-external-link"></i>
                          {lang === 'ar' ? `رابط المنتج ${idx + 1}` : `Link ${idx + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Section */}
              <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-white/5 min-w-[300px]">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">{lang === 'ar' ? 'أصناف الطلب' : 'Order Items'}</h5>
                  {editingItemsOrderId === order.id ? (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Live Total</p>
                        <p className="text-xs font-black text-green-500">
                          {tempItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)} SAR
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveItems(order.id)} className="text-[9px] bg-green-500 text-white px-3 py-1 rounded-lg font-black uppercase shadow-sm hover:scale-105 transition-all">Save</button>
                        <button onClick={() => setEditingItemsOrderId(null)} className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-lg font-black uppercase">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditingItemsOrderId(order.id);
                        setTempItems([...order.items]);
                      }} 
                      className="text-[9px] text-[#C5A028] font-black uppercase hover:underline"
                    >
                      {lang === 'ar' ? 'تعديل الأسعار' : 'Edit Prices'}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {(editingItemsOrderId === order.id ? tempItems : order.items).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <img src={item.imageUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        <div>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white truncate max-w-[120px]">{item.name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{getStoreName(item.storeId || 'unknown')}</p>
                          {item.productUrl && <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-[8px] text-blue-500 hover:underline">Link</a>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {editingItemsOrderId === order.id ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              disabled={!item.productUrl}
                              className={`w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1 rounded text-[10px] font-black ${!item.productUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                              value={item.price}
                              onChange={e => {
                                if (!item.productUrl) return;
                                const newItems = [...tempItems];
                                newItems[idx] = { ...newItems[idx], price: Number(e.target.value) };
                                setTempItems(newItems);
                              }}
                            />
                            <span className="text-[8px] font-bold text-slate-400">SAR</span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <p className="text-[10px] font-black text-[#C5A028]">{item.price} SAR</p>
                            <p className="text-[8px] text-slate-400 font-bold">x{item.quantity}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex -space-x-3 overflow-hidden">
                  {order.items.slice(0, 3).map((item, i) => <img key={i} src={item.imageUrl} className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" alt="" />)}
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[180px]">
                 <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">{t('updateStatus')}</label>
                 <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)} className={`border-2 border-transparent focus:border-[#C5A028] outline-none px-4 py-4 rounded-2xl text-xs font-black transition-all cursor-pointer ${order.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-500' : order.status === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-500' : order.status === 'awaiting_quote' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500' : order.status === 'quote_ready' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500' : 'bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white'}`}>
                   {statusList.map(s => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                 </select>
                 {order.status === 'awaiting_quote' && (
                   <button 
                     onClick={() => handleStatusChange(order, 'quote_ready')}
                     className="w-full bg-green-500 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all mt-2"
                   >
                     {lang === 'ar' ? 'إرسال التسعيرة للعميل' : 'Send Quote to Customer'}
                   </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="space-y-8 animate-slide-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex bg-white dark:bg-slate-900/30 p-1 rounded-xl w-fit border border-gray-100 dark:border-white/5">
              <button 
                onClick={() => setCatalogSubTab('categories')} 
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${catalogSubTab === 'categories' ? 'bg-[#C5A028] text-[#020617]' : 'text-gray-400'}`}
              >
                {lang === 'ar' ? 'الأقسام' : 'Categories'}
              </button>
              <button 
                onClick={() => setCatalogSubTab('products')} 
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${catalogSubTab === 'products' ? 'bg-[#C5A028] text-[#020617]' : 'text-gray-400'}`}
              >
                {lang === 'ar' ? 'المنتجات' : 'Products'}
              </button>
            </div>

            <button 
              onClick={() => {
                if (catalogSubTab === 'categories') setEditingCategory({});
                else setEditingProduct({});
              }}
              className="bg-[#1a2b4c] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              {catalogSubTab === 'categories' ? (lang === 'ar' ? 'إضافة قسم' : 'Add Category') : (lang === 'ar' ? 'إضافة منتج' : 'Add Product')}
            </button>
          </div>

          {catalogSubTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 h-fit space-y-6">
                <h3 className="font-black text-[#1a2b4c] dark:text-white uppercase text-sm tracking-widest">
                  {editingCategory?.id ? (lang === 'ar' ? 'تعديل قسم' : 'Edit Category') : (lang === 'ar' ? 'إضافة قسم جديد' : 'Add New Category')}
                </h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Name (EN)" 
                    className="w-full bg-[#f9f7f2] dark:bg-slate-950 border border-[#e0e0e0] dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    value={editingCategory?.name || ''}
                    onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="الاسم (عربي)" 
                    className="w-full bg-[#f9f7f2] dark:bg-slate-950 border border-[#e0e0e0] dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    value={editingCategory?.nameAr || ''}
                    onChange={e => setEditingCategory({...editingCategory, nameAr: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Icon (fa-tag, fa-gem...)" 
                    className="w-full bg-[#f9f7f2] dark:bg-slate-950 border border-[#e0e0e0] dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    value={editingCategory?.icon || ''}
                    onChange={e => setEditingCategory({...editingCategory, icon: e.target.value})}
                  />
                  <div className="flex items-center gap-2 px-2">
                    <input 
                      type="checkbox" 
                      id="catIsBride"
                      checked={editingCategory?.isBride || false}
                      onChange={e => setEditingCategory({...editingCategory, isBride: e.target.checked})}
                    />
                    <label htmlFor="catIsBride" className="text-[10px] font-black uppercase text-rose-500">Bride Category / قسم عروسة</label>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={saveCategory} 
                      disabled={!isCategoryValid}
                      className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all ${isCategoryValid ? 'bg-[#1a2b4c] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}`}
                    >
                      {lang === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                    {editingCategory && (
                      <button onClick={() => setEditingCategory(null)} className="px-6 bg-[#f5f1e8] dark:bg-slate-800 text-[#1a2b4c] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">
                        <i className="fa-solid fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {categories.map(cat => (
                  <div key={cat.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-[#e0e0e0] dark:border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#c4a76d]/10 rounded-xl flex items-center justify-center text-[#c4a76d] text-xl">
                        <i className={`fa-solid ${cat.icon}`}></i>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-[#1a2b4c] dark:text-white text-sm">{lang === 'ar' ? cat.nameAr : cat.name}</h4>
                          {cat.isBride && (
                            <span className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-rose-100 dark:border-rose-500/20">
                              Bride
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#7a7a7a] uppercase font-bold tracking-widest">{cat.id}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingCategory(cat)} className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button onClick={async () => { 
                        if(confirm('Delete?')) { 
                          await DB.deleteCategory(cat.id); 
                          toast.success(lang === 'ar' ? 'تم حذف القسم' : 'Category deleted');
                          fetchData(); 
                        } 
                      }} className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {catalogSubTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5 h-fit space-y-6">
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-widest">
                  {editingProduct?.id ? (lang === 'ar' ? 'تعديل منتج' : 'Edit Product') : (lang === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')}
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-2">
                      <input 
                        type="checkbox" 
                        id="isBride"
                        checked={editingProduct?.isBride || false}
                        onChange={e => setEditingProduct({...editingProduct, isBride: e.target.checked, categoryId: e.target.checked ? '' : editingProduct.categoryId})}
                      />
                      <label htmlFor="isBride" className="text-[10px] font-black uppercase text-rose-500">Bride Section / قسم العروسة</label>
                    </div>

                    {editingProduct?.isBride ? (
                      <select 
                        className="w-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-500/10 p-4 rounded-xl text-xs font-bold"
                        value={editingProduct?.brideCategoryId || ''}
                        onChange={e => setEditingProduct({...editingProduct, brideCategoryId: e.target.value})}
                      >
                        <option value="">{lang === 'ar' ? 'اختر صنف العروسة' : 'Select Bride Category'}</option>
                        {[...BRIDE_CATEGORIES, ...categories.filter(c => c.isBride)].map(c => (
                          <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <select 
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                        value={editingProduct?.categoryId || ''}
                        onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})}
                      >
                        <option value="">{lang === 'ar' ? 'اختر القسم' : 'Select Category'}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.nameAr : c.name}</option>)}
                      </select>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Name (EN)" 
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    value={editingProduct?.name || ''}
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="الاسم (عربي)" 
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    value={editingProduct?.nameAr || ''}
                    onChange={e => setEditingProduct({...editingProduct, nameAr: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="number" 
                      placeholder="Price" 
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                      value={editingProduct?.price || ''}
                      onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                    />
                    <input 
                      type="number" 
                      placeholder="Old Price" 
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                      value={editingProduct?.oldPrice || ''}
                      onChange={e => setEditingProduct({...editingProduct, oldPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      {lang === 'ar' ? 'صورة المنتج' : 'Product Image'}
                    </label>
                    <div 
                      onClick={() => productFileInputRef.current?.click()}
                      className="w-full aspect-video bg-gray-50 dark:bg-slate-950 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#C5A028] transition-all overflow-hidden relative group"
                    >
                      {editingProduct?.imageUrl ? (
                        <>
                          <img src={editingProduct.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <i className="fa-solid fa-camera text-white text-2xl"></i>
                          </div>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-300 mb-2"></i>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">
                            {isUploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'اضغط لرفع صورة' : 'Click to upload image')}
                          </p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={productFileInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <textarea 
                    placeholder="Description (EN)" 
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    rows={3}
                    value={editingProduct?.description || ''}
                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                  ></textarea>
                  <textarea 
                    placeholder="الوصف (عربي)" 
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                    rows={3}
                    value={editingProduct?.descriptionAr || ''}
                    onChange={e => setEditingProduct({...editingProduct, descriptionAr: e.target.value})}
                  ></textarea>

                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-white/10">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      {lang === 'ar' ? 'المقاسات' : 'Sizes'}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        id="newSizeInput"
                        placeholder="S, M, L..." 
                        className="flex-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 p-2 rounded-lg text-xs font-bold"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              const newSizes = [...(editingProduct?.sizes || []), { name: val, isAvailable: true }];
                              setEditingProduct({...editingProduct, sizes: newSizes});
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('newSizeInput') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val) {
                            const newSizes = [...(editingProduct?.sizes || []), { name: val, isAvailable: true }];
                            setEditingProduct({...editingProduct, sizes: newSizes});
                            input.value = '';
                          }
                        }}
                        className="bg-[#1a2b4c] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase"
                      >
                        {lang === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(editingProduct?.sizes || []).map((s, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${s.isAvailable ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10' : 'bg-gray-200 dark:bg-slate-800 border-transparent opacity-50'}`}>
                          <span className="text-[10px] font-black uppercase">{s.name}</span>
                          <button 
                            type="button"
                            onClick={() => {
                              const newSizes = [...(editingProduct?.sizes || [])];
                              newSizes[idx] = { ...newSizes[idx], isAvailable: !newSizes[idx].isAvailable };
                              setEditingProduct({...editingProduct, sizes: newSizes});
                            }}
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${s.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                          >
                            {s.isAvailable ? (lang === 'ar' ? 'متوفر' : 'In Stock') : (lang === 'ar' ? 'نفذ' : 'Out')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              const newSizes = (editingProduct?.sizes || []).filter((_, i) => i !== idx);
                              setEditingProduct({...editingProduct, sizes: newSizes});
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <i className="fa-solid fa-times text-[10px]"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-white/10">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      {lang === 'ar' ? 'الألوان' : 'Colors'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        id="newColorNameInput"
                        placeholder="Red, Blue..." 
                        className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 p-2 rounded-lg text-xs font-bold"
                      />
                      <input 
                        type="color" 
                        id="newColorHexInput"
                        className="w-full h-8 rounded-lg cursor-pointer"
                        defaultValue="#000000"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const nameInput = document.getElementById('newColorNameInput') as HTMLInputElement;
                        const hexInput = document.getElementById('newColorHexInput') as HTMLInputElement;
                        const name = nameInput.value.trim();
                        const hex = hexInput.value;
                        if (name) {
                          const newColors = [...(editingProduct?.colors || []), { name, hex, isAvailable: true }];
                          setEditingProduct({...editingProduct, colors: newColors});
                          nameInput.value = '';
                        }
                      }}
                      className="w-full bg-[#1a2b4c] text-white py-2 rounded-lg text-[10px] font-black uppercase"
                    >
                      {lang === 'ar' ? 'إضافة لون' : 'Add Color'}
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {(editingProduct?.colors || []).map((c, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${c.isAvailable ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10' : 'bg-gray-200 dark:bg-slate-800 border-transparent opacity-50'}`}>
                          <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }}></div>
                          <span className="text-[10px] font-black uppercase">{c.name}</span>
                          <button 
                            type="button"
                            onClick={() => {
                              const newColors = [...(editingProduct?.colors || [])];
                              newColors[idx] = { ...newColors[idx], isAvailable: !newColors[idx].isAvailable };
                              setEditingProduct({...editingProduct, colors: newColors});
                            }}
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${c.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                          >
                            {c.isAvailable ? (lang === 'ar' ? 'متوفر' : 'In Stock') : (lang === 'ar' ? 'نفذ' : 'Out')}
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              const newColors = (editingProduct?.colors || []).filter((_, i) => i !== idx);
                              setEditingProduct({...editingProduct, colors: newColors});
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <i className="fa-solid fa-times text-[10px]"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isDiscounted"
                        checked={editingProduct?.isDiscounted || false}
                        onChange={e => setEditingProduct({...editingProduct, isDiscounted: e.target.checked})}
                      />
                      <label htmlFor="isDiscounted" className="text-[10px] font-black uppercase text-gray-400">Sale</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isOffer"
                        checked={editingProduct?.isOffer || false}
                        onChange={e => setEditingProduct({...editingProduct, isOffer: e.target.checked})}
                      />
                      <label htmlFor="isOffer" className="text-[10px] font-black uppercase text-[#c4a76d]">Offers / عروض</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="isFlashSale"
                        checked={editingProduct?.isFlashSale || false}
                        onChange={e => setEditingProduct({...editingProduct, isFlashSale: e.target.checked})}
                      />
                      <label htmlFor="isFlashSale" className="text-[10px] font-black uppercase text-rose-500">Flash / خاطفة</label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={saveProduct} 
                      disabled={!isProductValid}
                      className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all ${isProductValid ? 'bg-[#C5A028] text-[#020617]' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}`}
                    >
                      {lang === 'ar' ? 'حفظ' : 'Save'}
                    </button>
                    {editingProduct && (
                      <button onClick={() => setEditingProduct(null)} className="px-6 bg-gray-100 dark:bg-slate-800 text-gray-400 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">
                        <i className="fa-solid fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {products.map(prod => (
                  <div key={prod.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <img src={prod.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-50 dark:bg-slate-950" alt="" />
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm">{lang === 'ar' ? prod.nameAr : prod.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[#C5A028] font-black text-xs">{prod.price} SAR</span>
                          <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">
                            {prod.isBride 
                              ? ([...BRIDE_CATEGORIES, ...categories].find(c => c.id === prod.brideCategoryId)?.nameAr || 'Bride')
                              : (categories.find(c => c.id === prod.categoryId)?.nameAr || 'Product')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingProduct(prod)} className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button onClick={async () => { 
                        if(confirm('Delete?')) { 
                          await DB.deleteProduct(prod.id); 
                          toast.success(lang === 'ar' ? 'تم حذف المنتج' : 'Product deleted');
                          fetchData(); 
                        } 
                      }} className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="animate-slide-up space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-center mb-10">
              <h4 className="font-black text-gray-900 dark:text-white uppercase text-sm tracking-widest">{lang === 'ar' ? 'إعدادات المتجر العامة' : 'Global Store Settings'}</h4>
              <i className="fa-solid fa-cog text-[#C5A028] text-xl"></i>
            </div>
            
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'وقت انتهاء العرض الخاطف' : 'Flash Sale End Time'}</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold"
                  value={settings.flashSaleEndTime ? new Date(settings.flashSaleEndTime).toISOString().slice(0, 16) : ''}
                  onChange={e => setSettings({...settings, flashSaleEndTime: new Date(e.target.value).toISOString()})}
                />
                <p className="text-[9px] text-gray-400 italic">{lang === 'ar' ? 'حدد التاريخ والوقت الذي ينتهي فيه العرض الخاطف في الصفحة الرئيسية.' : 'Set the date and time when the flash sale ends on the home page.'}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'نص "من نحن" (عربي)' : 'About Us Text (AR)'}</label>
                <textarea 
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold min-h-[100px]"
                  value={settings.aboutUsAr || ''}
                  onChange={e => setSettings({...settings, aboutUsAr: e.target.value})}
                  placeholder="شركة خدمات لوجستية ووسيط شراء..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'نص "من نحن" (إنجليزي)' : 'About Us Text (EN)'}</label>
                <textarea 
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold min-h-[100px]"
                  value={settings.aboutUsEn || ''}
                  onChange={e => setSettings({...settings, aboutUsEn: e.target.value})}
                  placeholder="Logistics services company..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'نص الشريط العلوي (عربي)' : 'Top Bar Text (AR)'}</label>
                <textarea 
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold min-h-[60px]"
                  value={settings.topBarAr || ''}
                  onChange={e => setSettings({...settings, topBarAr: e.target.value})}
                  placeholder="شركة خدمات لوجستية ووسيط شراء..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'نص الشريط العلوي (إنجليزي)' : 'Top Bar Text (EN)'}</label>
                <textarea 
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-4 rounded-xl text-xs font-bold min-h-[60px]"
                  value={settings.topBarEn || ''}
                  onChange={e => setSettings({...settings, topBarEn: e.target.value})}
                  placeholder="Logistics services company..."
                />
              </div>

              {/* Banner Management */}
              <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{lang === 'ar' ? 'صور اللوحات الإعلانية (Banners)' : 'Banner Images'}</label>
                  <button 
                    onClick={() => {
                      const newBanners = [...(settings.banners || []), ''];
                      setSettings({...settings, banners: newBanners});
                    }}
                    className="text-[10px] font-black text-[#C5A028] uppercase hover:underline"
                  >
                    {lang === 'ar' ? '+ إضافة صورة' : '+ Add Image'}
                  </button>
                </div>
                <div className="space-y-3">
                  {(settings.banners || []).map((url: string, idx: number) => (
                    <div key={idx} className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Banner #{idx + 1}</span>
                        <button 
                          onClick={() => {
                            const newBanners = settings.banners.filter((_: any, i: number) => i !== idx);
                            setSettings({...settings, banners: newBanners});
                          }}
                          className="text-red-500 hover:text-red-600 transition-colors"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                      
                      <div 
                        onClick={() => {
                          setUploadingBannerIdx(idx);
                          bannerFileInputRef.current?.click();
                        }}
                        className="w-full aspect-[21/9] bg-white dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#C5A028] transition-all overflow-hidden relative group"
                      >
                        {url ? (
                          <>
                            <img src={url} className="w-full h-full object-cover" alt="Banner Preview" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <i className="fa-solid fa-camera text-white text-xl"></i>
                            </div>
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-image text-2xl text-gray-300 mb-1"></i>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              {isUploading && uploadingBannerIdx === idx ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'اضغط لرفع صورة' : 'Click to upload')}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <input 
                    type="file" 
                    ref={bannerFileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleBannerUpload}
                  />
                </div>
              </div>

              <button 
                onClick={saveSettings}
                disabled={isSavingSettings}
                className="bg-[#1a2b4c] dark:bg-[#c4a76d] text-white dark:text-[#1a2b4c] px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSavingSettings ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
