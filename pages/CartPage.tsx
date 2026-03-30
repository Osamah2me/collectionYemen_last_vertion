
import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Language } from '../types';
import { useCart } from '../context/CartContext';
import { TRANSLATIONS } from '../constants';

interface Props {
  lang: Language;
  onCheckout: () => void;
  onRequestQuote: () => void;
}

const CartPage: React.FC<Props> = ({ lang, onCheckout, onRequestQuote }) => {
  const { cart, removeFromCart, updateCartItem, refreshCartPrices, totalAmount } = useCart();
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  const hasInternationalItems = cart.some(item => 
    item.storeId !== 'internal' && item.storeId !== 'collection_store'
  );

  const needsPricing = cart.some(item => 
    (item.storeId !== 'internal' && item.storeId !== 'collection_store') && item.price === 0
  );

  const isAwaiting = cart.some(item => item.isAwaitingQuote);

  useEffect(() => {
    const sync = async () => {
      await refreshCartPrices();
    };
    sync();
    // Auto sync every 15 seconds while on cart page
    const interval = setInterval(sync, 15000);
    return () => clearInterval(interval);
  }, []);

  if (cart.length === 0) {
    return (
      <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 animate-fade-in flex flex-col items-center gap-8">
        <div className="w-32 h-32 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center shadow-inner">
          <i className="fa-solid fa-cart-shopping text-5xl text-slate-200 dark:text-white/5 animate-pulse"></i>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#7a7a7a] uppercase tracking-widest">{t('emptyCart')}</h2>
          <p className="text-xs text-[#7a7a7a] font-bold uppercase">{lang === 'ar' ? 'أضف بعض المنتجات لتبدأ التسوق' : 'Add some products to start shopping'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-24 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="h-6 md:h-10 w-1 md:w-2 bg-[#1a2b4c] rounded-full"></div>
          <h2 className="text-xl md:text-5xl font-black tracking-tighter text-[#1a2b4c] dark:text-white uppercase">{t('cart')}</h2>
          <button 
            onClick={() => refreshCartPrices()}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-[#1a2b4c] transition-all active:rotate-180 duration-500"
            title={lang === 'en' ? 'Refresh Prices' : 'تحديث الأسعار'}
          >
            <i className="fa-solid fa-rotate text-[10px] md:text-sm"></i>
          </button>
        </div>
        <span className="text-[8px] md:text-[10px] font-black text-[#7a7a7a] uppercase tracking-[0.2em] md:tracking-[0.3em]">{cart.length} ITEMS</span>
      </div>
      
      <div className="grid gap-4 md:gap-6">
        {cart.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[3rem] shadow-lg border border-[#e0e0e0] dark:border-white/5 flex flex-col md:flex-row gap-4 md:gap-6 hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="w-full md:w-40 h-32 md:h-40 shrink-0 overflow-hidden rounded-xl md:rounded-[2.5rem] border border-[#e0e0e0] dark:border-white/10 relative bg-slate-50 dark:bg-slate-950 flex items-center justify-center group-hover:bg-[#1a2b4c]/5 transition-colors">
              <img 
                src={item.imageUrl} 
                alt="" 
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-110 transition-transform duration-700 p-2 md:p-4" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://img.icons8.com/ios-filled/100/1a2b4c/box.png";
                }}
              />
              <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-white/90 dark:bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[7px] md:text-[8px] font-black shadow-lg border border-[#e0e0e0] dark:border-white/10 uppercase dark:text-white tracking-widest">
                {item.storeId === 'internal' || item.storeId === 'collection_store' ? (lang === 'ar' ? 'متجرنا' : 'Collection') : item.storeId}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2 md:space-y-4">
              <div className="space-y-0.5 md:space-y-1">
                <h4 className="font-black text-[#1a2b4c] dark:text-white text-sm md:text-xl line-clamp-1 group-hover:text-[#1a2b4c] transition-colors">{item.name}</h4>
                
                {/* Variant Display */}
                {(item.selectedSize || item.selectedColor) && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.selectedSize && (
                      <span className="text-[7px] md:text-[9px] font-black bg-[#1a2b4c]/5 dark:bg-white/5 text-[#1a2b4c] dark:text-white px-2 py-0.5 rounded border border-[#1a2b4c]/10 dark:border-white/10 uppercase">
                        {lang === 'ar' ? 'المقاس: ' : 'Size: '}{item.selectedSize}
                      </span>
                    )}
                    {item.selectedColor && (
                      <div className="flex items-center gap-1.5 bg-[#1a2b4c]/5 dark:bg-white/5 px-2 py-0.5 rounded border border-[#1a2b4c]/10 dark:border-white/10">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border border-white/20" style={{ backgroundColor: item.selectedColor.hex }}></div>
                        <span className="text-[7px] md:text-[9px] font-black text-[#1a2b4c] dark:text-white uppercase">
                          {lang === 'ar' ? 'اللون: ' : 'Color: '}{item.selectedColor.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                   <span className="text-[8px] md:text-[9px] text-green-600 dark:text-green-400 font-black bg-green-50 dark:bg-green-500/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-green-100 dark:border-green-500/20 flex items-center gap-1 uppercase tracking-tight">
                     <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                     {lang === 'en' ? 'Authentic' : 'منتج أصلي'}
                   </span>
                </div>
              </div>
              
              <div className="flex items-baseline gap-1.5 md:gap-2">
                {item.price === 0 ? (
                  <span className="text-sm md:text-2xl font-black text-rose-500 tracking-tighter uppercase animate-pulse">
                    {item.isAwaitingQuote ? (lang === 'ar' ? 'بانتظار التسعير...' : 'Awaiting Quote...') : (lang === 'ar' ? 'السعر قيد المراجعة' : 'Price pending review')}
                  </span>
                ) : (
                  <>
                    <span className="text-xl md:text-4xl font-black text-[#1a2b4c] dark:text-white tracking-tighter">{item.price}</span>
                    <span className="text-[8px] md:text-sm font-bold text-[#c4a76d] uppercase tracking-widest">SAR</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-row md:flex-col justify-between items-center md:items-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 md:border-r border-[#e0e0e0] dark:border-white/5 md:pr-6 gap-3 md:gap-4">
              <button 
                onClick={() => {
                  removeFromCart(item.id);
                  toast.success(lang === 'ar' ? 'تم حذف المنتج من السلة' : 'Product removed from cart');
                }} 
                className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-90"
              >
                <i className="fa-solid fa-trash-can text-xs md:text-lg"></i>
              </button>
              
              <div className="flex items-center bg-slate-50 dark:bg-black/40 rounded-xl md:rounded-2xl border border-[#e0e0e0] dark:border-white/10 overflow-hidden shadow-inner">
                 <button 
                   onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                   className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-[#1a2b4c] hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                 >
                   <i className="fa-solid fa-minus text-[8px] md:text-[10px]"></i>
                 </button>
                 <div className="px-2 md:px-4 flex flex-col items-center">
                    <span className="text-[6px] md:text-[8px] text-[#7a7a7a] font-black uppercase tracking-tighter">{lang === 'ar' ? 'الكمية' : 'Qty'}</span>
                    <span className="text-[10px] md:text-sm font-black text-[#1a2b4c] dark:text-white">{item.quantity}</span>
                 </div>
                 <button 
                   onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                   className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-[#1a2b4c] hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                 >
                   <i className="fa-solid fa-plus text-[8px] md:text-[10px]"></i>
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout Summary Section - Not Fixed anymore */}
      <div className="mt-8 md:mt-12 bg-[#1a2b4c] p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
        <div className="flex flex-col items-center md:items-start pl-0 md:pl-8 md:border-l border-white/10 w-full md:w-auto">
          <span className="text-[8px] md:text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">{t('total')}</span>
          <div className="flex items-baseline gap-2">
            {totalAmount > 0 ? (
              <>
                <span className="text-2xl md:text-5xl font-black text-white tracking-tighter">{totalAmount.toFixed(2)}</span>
                <span className="text-[10px] md:text-xs font-bold text-[#c4a76d] uppercase tracking-widest">SAR</span>
              </>
            ) : (
              <span className="text-lg md:text-3xl font-black text-[#c4a76d] uppercase tracking-tighter">
                {lang === 'ar' ? 'بانتظار التسعير' : 'Pending Pricing'}
              </span>
            )}
          </div>
          {cart.some(i => i.price === 0) && (
            <p className="text-[8px] md:text-[9px] text-white/40 font-bold uppercase mt-1 md:mt-2">
              {lang === 'ar' ? '* يتضمن طلبات قيد تسعير الدعم' : '* Includes items pending support pricing'}
            </p>
          )}
        </div>
        
        <button 
          onClick={needsPricing ? onRequestQuote : onCheckout}
          disabled={isAwaiting && needsPricing}
          className={`w-full md:flex-1 py-4 md:py-6 rounded-xl md:rounded-[2.5rem] font-black text-sm md:text-xl hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 shadow-2xl uppercase tracking-widest group disabled:opacity-50 disabled:scale-100 ${needsPricing ? 'bg-rose-500 text-white shadow-rose-500/25' : 'bg-[#c4a76d] text-[#1a2b4c] shadow-[#c4a76d]/25'}`}
        >
          {isAwaiting && needsPricing ? (lang === 'ar' ? 'جاري مراجعة طلبك...' : 'Reviewing Request...') : (needsPricing ? t('requestQuote') : t('checkout'))}
          <i className={`fa-solid ${needsPricing ? 'fa-file-invoice-dollar' : (lang === 'en' ? 'fa-credit-card' : 'fa-receipt')} text-sm md:text-2xl group-hover:rotate-12 transition-transform`}></i>
        </button>
      </div>
    </div>
  );
};

export default CartPage;
