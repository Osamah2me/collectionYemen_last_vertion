
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Language, CartItem } from '../types';
import { STORES, TRANSLATIONS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { extractProductDetails } from '../services/gemini';

interface Props {
  lang: Language;
  storeId: string;
  onBack: () => void;
}

const StoreView: React.FC<Props> = ({ lang, storeId, onBack }) => {
  const store = STORES.find(s => s.id === storeId)!;
  const { addToCart } = useCart();
  const { user } = useAuth();
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  const [productUrl, setProductUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSupportContact = () => {
    const phone = '+967774757728';
    const message = lang === 'en' 
      ? `Hello, I want to order a product from ${store.name}` 
      : `مرحباً، أود طلب منتج من متجر ${store.nameAr}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('restricted'));
      return;
    }
    if (!productUrl) return;

    setIsSubmitting(true);
    try {
      const cartItem: CartItem = {
        id: 'custom_' + Date.now(),
        storeId: store.id,
        name: lang === 'ar' ? `طلب من ${store.nameAr}` : `Order from ${store.name}`,
        price: 0, // Admin will update this later in the order
        currency: 'SAR',
        imageUrl: store.logo,
        quantity: 1,
        productUrl: productUrl
      };

      addToCart(cartItem);
      setProductUrl('');
    } catch (err) {
      alert("Error adding to cart.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-slide-up pb-24 max-w-3xl mx-auto">
      {/* Header Navigation */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center text-[#1a2b4c] hover:bg-[#1a2b4c]/10 transition-colors">
          <i className={`fa-solid ${lang === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'}`}></i>
        </button>
        <div className="text-center">
           <h2 className="font-black text-lg md:text-xl text-[#1a2b4c] dark:text-white uppercase tracking-tighter">{lang === 'en' ? store.name : store.nameAr}</h2>
           <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[#c4a76d] mt-1 block">
             Verified Partner Store
           </span>
        </div>
        <div className="w-10 h-10 md:w-14 md:h-14 p-2 bg-white dark:bg-slate-950 rounded-xl border border-[#e0e0e0] dark:border-white/10 flex items-center justify-center">
           <img src={store.logo} className="w-full h-full object-contain" alt="Logo" />
        </div>
      </div>

      {/* Hero Store Card */}
      <div className="bg-[#1a2b4c] p-10 md:p-20 rounded-[3rem] md:rounded-[4.5rem] shadow-3xl text-center space-y-10 border-b-[10px] border-[#c4a76d] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c4a76d] opacity-10 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-[0.02] rounded-full blur-[60px] -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-8">
           <div className="w-24 h-24 md:w-40 md:h-40 bg-white p-4 md:p-8 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl animate-bounce-in">
              <img src={store.logo} className="w-full h-full object-contain" alt={store.name} />
           </div>

           <div className="space-y-4 max-w-xl">
              <h3 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                {lang === 'en' ? store.name : store.nameAr}
              </h3>
              <p className="text-white/60 text-sm md:text-xl font-bold leading-relaxed opacity-90">
                {lang === 'en' ? store.description : store.descriptionAr}
              </p>
           </div>

           <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-6">
              <button 
                onClick={() => window.open(store.url, '_blank')} 
                className="flex-1 bg-white text-[#1a2b4c] py-5 md:py-6 rounded-2xl font-black text-xs md:text-sm uppercase hover:bg-[#f5f1e8] transition-all shadow-xl flex items-center justify-center gap-3"
              >
                <i className="fa-solid fa-external-link-alt"></i>
                {lang === 'ar' ? 'زيارة الموقع الرسمي' : 'Visit Official Site'}
              </button>
              <button 
                onClick={handleSupportContact}
                className="flex-1 bg-[#c4a76d] text-[#1a2b4c] py-5 md:py-6 rounded-2xl font-black text-xs md:text-sm uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                {lang === 'ar' ? 'طلب عبر الواتساب' : 'Order via WhatsApp'}
              </button>
           </div>
        </div>
      </div>

      {/* Submit Link Form */}
      <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1a2b4c]/5 rounded-2xl flex items-center justify-center text-[#1a2b4c]">
            <i className="fa-solid fa-link text-xl"></i>
          </div>
          <div>
            <h4 className="font-black text-[#1a2b4c] dark:text-white uppercase text-sm md:text-lg">
              {lang === 'ar' ? 'توثيق طلبك في الموقع' : 'Document your order on site'}
            </h4>
            <p className="text-[10px] md:text-xs text-[#7a7a7a] font-bold uppercase tracking-widest">
              {lang === 'ar' ? 'الصق رابط المنتج وسنقوم بمراجعته وتحديد السعر' : 'Paste product link and we will review and set the price'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="relative">
            <input 
              type="url" 
              placeholder={lang === 'ar' ? 'الصق رابط المنتج هنا...' : 'Paste product link here...'}
              required
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-[#e0e0e0] dark:border-white/10 p-5 md:p-6 rounded-2xl text-xs md:text-sm font-bold outline-none focus:border-[#1a2b4c] transition-all pr-24 md:pr-40"
            />
            <div className="absolute right-2 top-2 bottom-2">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="h-full bg-[#1a2b4c] text-white px-6 md:px-10 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-[#253b66] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : (lang === 'ar' ? 'إرسال' : 'SUBMIT')}
              </button>
            </div>
          </div>
          <p className="text-[9px] text-[#7a7a7a] font-bold uppercase tracking-widest px-2">
            {lang === 'ar' ? '* سيتم التواصل معك عبر الواتساب أو الإشعارات فور تحديد السعر' : '* We will contact you via WhatsApp or notifications once price is set'}
          </p>
        </form>
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-[#e0e0e0] dark:border-white/5 space-y-4 shadow-lg">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
               <i className="fa-solid fa-shield-check text-xl"></i>
            </div>
            <h4 className="font-black text-[#1a2b4c] dark:text-white uppercase text-sm">{lang === 'ar' ? 'تسوق آمن ومضمون' : 'Safe & Guaranteed'}</h4>
            <p className="text-[11px] text-[#7a7a7a] font-bold leading-relaxed uppercase">
              {lang === 'ar' ? 'نحن نضمن لك جودة المنتج ووصوله بأمان من المتجر العالمي إلى باب بيتك في اليمن.' : 'We guarantee product quality and safe delivery from the global store to your door in Yemen.'}
            </p>
         </div>
         <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-[#e0e0e0] dark:border-white/5 space-y-4 shadow-lg">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
               <i className="fa-solid fa-truck-fast text-xl"></i>
            </div>
            <h4 className="font-black text-[#1a2b4c] dark:text-white uppercase text-sm">{lang === 'ar' ? 'شحن دولي موحد' : 'Unified Shipping'}</h4>
            <p className="text-[11px] text-[#7a7a7a] font-bold leading-relaxed uppercase">
              {lang === 'ar' ? 'استمتع بأقل تكلفة شحن دولي لليمن مع إمكانية التتبع المباشر لجميع طلباتك.' : 'Enjoy the lowest international shipping cost to Yemen with live tracking for all your orders.'}
            </p>
         </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-center p-8 bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
          {lang === 'ar' 
            ? `ملاحظة: لطلب أي منتج من ${store.nameAr}، يرجى التواصل مع الدعم الفني وتزويدنا برابط المنتج.` 
            : `Note: To order any item from ${store.name}, please contact support and provide us with the product link.`}
        </p>
      </div>
    </div>
  );
};

export default StoreView;
