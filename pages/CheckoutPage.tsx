
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Language, PaymentMethod } from '../types';
import { TRANSLATIONS } from '../constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { DB, Order } from '../services/storage';

interface Props { lang: Language; onComplete: () => void; }

const CheckoutPage: React.FC<Props> = ({ lang, onComplete }) => {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const [hasPendingPrices, setHasPendingPrices] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [triedSubmitting, setTriedSubmitting] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '' });
  
  const { totalAmount, clearCart, cart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, name: user.name || '' }));
    }
  }, [user]);
  const { addNotification } = useNotifications();
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedOrderId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePay = async () => {
    if (!user) return;
    if (cart.length === 0) return;

    setTriedSubmitting(true);
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (!method) {
      toast.error(lang === 'ar' ? 'يرجى اختيار طريقة الدفع' : 'Please select a payment method');
      return;
    }

    if (method === PaymentMethod.CARD) {
      if (!cardData.number || !cardData.expiry || !cardData.cvv) {
        toast.error(lang === 'ar' ? 'يرجى إدخال بيانات البطاقة' : 'Please enter card details');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const pending = cart.some(i => i.price === 0);
      setHasPendingPrices(pending);
      
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        userName: formData.name,
        userPhone: formData.phone,
        userAddress: formData.address,
        items: [...cart],
        total: totalAmount,
        date: new Date().toISOString(),
        status: 'pending',
        paymentMethod: method
      };
      
      await DB.saveOrder(newOrder);
      toast.success(lang === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Order submitted successfully!');
      setGeneratedOrderId(orderId);
      setShowSuccess(true);
      
      // Add Order Success Notification
      addNotification({
        title: 'Order Placed!',
        titleAr: 'تم استلام طلبك!',
        message: `Your order #${orderId} is being reviewed. Total: ${totalAmount} SAR`,
        messageAr: `طلبك رقم #${orderId} قيد المراجعة حالياً. المجموع: ${totalAmount} ريال`,
        type: 'order'
      });

      clearCart();
    } catch (err) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error placing order');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const PaymentOption = ({ type, icon, title, subtitle, details, color }: { type: PaymentMethod, icon: string, title: string, subtitle?: string, details?: string[], color: string }) => (
    <div 
      onClick={() => setMethod(type)}
      className={`p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border-2 transition-all cursor-pointer flex flex-col gap-3 md:gap-4 relative overflow-hidden ${method === type ? `border-[${color}] bg-white dark:bg-slate-900 shadow-2xl ring-4 md:ring-8 ring-${color}/5` : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/40 hover:border-slate-200'}`}
      style={{ borderColor: method === type ? color : '' }}
    >
      <div className="flex items-center gap-3 md:gap-5 relative z-10">
        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg ${method === type ? 'text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300'}`} style={{ backgroundColor: method === type ? color : '' }}>
          <i className={`${icon} text-base md:text-xl`}></i>
        </div>
        <div className="flex-1">
          <h4 className={`text-xs md:text-lg font-black transition-colors ${method === type ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{title}</h4>
          {subtitle && <p className="text-[8px] md:text-[9px] text-slate-400 mt-0.5 uppercase font-black tracking-widest">{subtitle}</p>}
        </div>
        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${method === type ? 'border-slate-900 dark:border-white' : 'border-slate-100 dark:border-white/10'}`}>
          {method === type && <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-slate-900 dark:bg-white rounded-full animate-pulse" />}
        </div>
      </div>
      
      {method === type && details && (
        <div className="mt-1 md:mt-2 space-y-2 md:space-y-3 animate-slide-up border-t border-slate-50 dark:border-white/10 pt-4 md:pt-5 relative z-10">
          {details.map((line, i) => (
            <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-black/20 p-3 md:p-4 rounded-lg md:rounded-xl border border-slate-100 dark:border-white/5">
              <span className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest">{line.split(':')[0]}</span>
              <span className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white">{line.split(':')[1]}</span>
            </div>
          ))}
          <div className="p-3 md:p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
            <p className="text-[9px] md:text-[10px] font-bold text-center text-amber-600 dark:text-amber-400 leading-relaxed">
              {lang === 'ar' 
                ? 'يرجى إتمام عملية التحويل أولاً، ثم تصوير الإيصال، ثم الضغط على "تأكيد الطلب" بالأسفل لإرسال الطلب للمراجعة.' 
                : 'Complete transfer first, take a screenshot, then click "CONFIRM" below to submit for review.'}
            </p>
          </div>
        </div>
      )}
      <i className={`${icon} absolute -bottom-4 -right-4 text-6xl md:text-8xl opacity-[0.03] rotate-12`}></i>

      {method === PaymentMethod.CARD && type === PaymentMethod.CARD && (
        <div className="mt-4 space-y-4 animate-slide-up border-t border-slate-50 dark:border-white/10 pt-6">
          <div className="space-y-1.5">
            <label className={`text-[9px] font-black uppercase tracking-widest px-1 transition-colors ${triedSubmitting && !cardData.number ? 'text-rose-500' : 'text-slate-400'}`}>
              {lang === 'ar' ? 'رقم البطاقة' : 'Card Number'}
            </label>
            <input 
              type="text"
              value={cardData.number}
              onChange={(e) => setCardData({...cardData, number: e.target.value})}
              className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-3 px-4 text-xs font-bold transition-all outline-none ${triedSubmitting && !cardData.number ? 'border-rose-500' : 'border-slate-100 dark:border-white/5 focus:border-[#c4a76d]'}`}
              placeholder="0000 0000 0000 0000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-widest px-1 transition-colors ${triedSubmitting && !cardData.expiry ? 'text-rose-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
              </label>
              <input 
                type="text"
                value={cardData.expiry}
                onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-3 px-4 text-xs font-bold transition-all outline-none ${triedSubmitting && !cardData.expiry ? 'border-rose-500' : 'border-slate-100 dark:border-white/5 focus:border-[#c4a76d]'}`}
                placeholder="MM/YY"
              />
            </div>
            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-widest px-1 transition-colors ${triedSubmitting && !cardData.cvv ? 'text-rose-500' : 'text-slate-400'}`}>
                CVV
              </label>
              <input 
                type="text"
                value={cardData.cvv}
                onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-3 px-4 text-xs font-bold transition-all outline-none ${triedSubmitting && !cardData.cvv ? 'border-rose-500' : 'border-slate-100 dark:border-white/5 focus:border-[#c4a76d]'}`}
                placeholder="123"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#1a2b4c]/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-6 animate-bounce-in shadow-3xl border border-[#c4a76d]/20 overflow-y-auto max-h-[90vh] no-scrollbar">
          <div className="w-20 h-20 bg-green-500 rounded-3xl text-white flex items-center justify-center mx-auto shadow-lg rotate-6">
             <i className="fa-solid fa-check-double text-3xl"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-black text-[#1a2b4c] dark:text-white uppercase tracking-tighter">{t('orderSuccess')}</h2>
            <p className="text-[10px] text-[#7a7a7a] font-bold uppercase tracking-widest">{lang === 'en' ? 'Use ID below to track.' : 'انسخ رقم الطلب لمتابعة حالته.'}</p>
          </div>
          
          <div className="bg-[#f9f7f2] dark:bg-slate-950 p-6 rounded-[2rem] border-2 border-dashed border-[#e0e0e0] dark:border-white/10 relative">
            <span className="text-[8px] text-[#7a7a7a] font-black uppercase tracking-[0.3em] mb-2 block">{t('orderNumber')}</span>
            <div className="text-2xl font-black text-[#c4a76d] tracking-[0.1em] uppercase mb-4">{generatedOrderId}</div>
            
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={copyToClipboard}
                className="w-full bg-[#e0e0e0] dark:bg-slate-800 text-[#1a2b4c] dark:text-slate-300 py-3 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
              >
                <i className={isCopied ? "fa-solid fa-check" : "fa-solid fa-copy"}></i>
                {isCopied ? t('copied') : t('copyId')}
              </button>

              <button 
                onClick={() => {
                  const text = lang === 'ar' 
                    ? `مرحباً، قمت بإتمام طلب جديد برقم: ${generatedOrderId}. المجموع: ${totalAmount} ريال. أرغب في تأكيد الدفع.`
                    : `Hello, I placed a new order: ${generatedOrderId}. Total: ${totalAmount} SAR. I want to confirm payment.`;
                  const phone = '+967774757728';
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full bg-green-500 text-white py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                {lang === 'ar' ? 'إرسال الإيصال للواتساب' : 'Send Receipt to WhatsApp'}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
            <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
              {hasPendingPrices 
                ? (lang === 'ar' 
                    ? 'تنبيه هام: طلبك يتضمن منتجات بروابط خارجية. سيقوم الدعم الفني بمراجعة الروابط وتحديث السعر النهائي.'
                    : 'IMPORTANT: Your order includes external links. Support will review links and update the final price.')
                : (lang === 'ar' 
                    ? 'خطوة أخيرة: يرجى إرسال صورة إيصال التحويل عبر الواتساب الآن.'
                    : 'FINAL STEP: Please send a screenshot of the transfer receipt via WhatsApp now.')}
            </p>
          </div>

          <button onClick={onComplete} className="w-full py-1 text-[#7a7a7a] font-black text-[9px] uppercase tracking-[0.2em] hover:text-[#1a2b4c] transition-colors">
            {lang === 'en' ? 'BACK TO MAIN STORE' : 'العودة لمتجر كوليكشن'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-fade-in max-w-2xl mx-auto space-y-8 md:space-y-12 px-2 md:px-0">
      <div className="text-center space-y-2 md:space-y-4">
        <h2 className="text-2xl md:text-6xl font-black tracking-tighter text-[#1a2b4c] dark:text-white uppercase">{t('checkout')}</h2>
        <div className="w-16 md:w-24 h-1 md:h-1.5 bg-[#c4a76d] mx-auto rounded-full"></div>
      </div>
      
      <div className="grid gap-8 md:gap-12">
        {/* Shipping Form */}
        <section className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-xl border border-[#e0e0e0] dark:border-white/5 space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-[#1a2b4c] rounded-xl flex items-center justify-center text-[#c4a76d]">
              <i className="fa-solid fa-truck-fast"></i>
            </div>
            <h3 className="text-lg md:text-xl font-black text-[#1a2b4c] dark:text-white uppercase tracking-tight">
              {lang === 'ar' ? 'بيانات الشحن والتواصل' : 'Shipping & Contact Info'}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-widest px-2 transition-colors ${triedSubmitting && !formData.name ? 'text-rose-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className={triedSubmitting && !formData.name ? 'text-rose-500' : 'text-rose-400'}>*</span>
              </label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-4 px-4 text-sm font-bold transition-all outline-none ${triedSubmitting && !formData.name ? 'border-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.1)]' : 'border-slate-100 dark:border-white/5 focus:border-[#c4a76d]'}`}
                placeholder={lang === 'ar' ? 'اسمك الثلاثي...' : 'Your full name...'}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-widest px-2 transition-colors ${triedSubmitting && !formData.phone ? 'text-rose-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'} <span className={triedSubmitting && !formData.phone ? 'text-rose-500' : 'text-rose-400'}>*</span>
              </label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-4 px-4 text-sm font-bold transition-all outline-none ${triedSubmitting && !formData.phone ? 'border-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.1)]' : 'border-slate-100 dark:border-white/5 focus:border-[#c4a76d]'}`}
                placeholder="77xxxxxxx"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-black uppercase tracking-widest px-2 transition-colors ${triedSubmitting && !formData.address ? 'text-rose-500' : 'text-slate-400'}`}>
                {lang === 'ar' ? 'العنوان بالتفصيل' : 'Detailed Address'} <span className={triedSubmitting && !formData.address ? 'text-rose-500' : 'text-rose-400'}>*</span>
              </label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-4 px-4 text-sm font-bold transition-all outline-none min-h-[100px] resize-none ${triedSubmitting && !formData.address ? 'border-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.1)]' : 'border-slate-100 dark:border-white/5 focus:border-[#c4a76d]'}`}
                placeholder={lang === 'ar' ? 'المدينة، الحي، الشارع، المعالم القريبة...' : 'City, Neighborhood, Street...'}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4 px-2">
            <i className="fa-solid fa-location-dot text-[#c4a76d] text-sm md:text-base"></i>
            <h3 className="text-[9px] md:text-[11px] font-black text-[#7a7a7a] uppercase tracking-[0.2em] md:tracking-[0.3em]">{t('localYemen')}</h3>
            <div className="h-px flex-1 bg-[#e0e0e0] dark:bg-white/5"></div>
          </div>
          <div className="grid gap-4 md:gap-5">
            <PaymentOption 
              type={PaymentMethod.KURAIMI} 
              icon="fa-solid fa-building-columns" 
              title={t('kuraimi')} 
              details={[`النقطة: 1570812`, `الاسم: كوليكشن`]}
              color="#006738"
            />
            <PaymentOption 
              type={PaymentMethod.JEEB} 
              icon="fa-solid fa-wallet" 
              title={t('jeeb')} 
              details={[`الرقم: 774757728`, `الاسم: حسام المحبشي`]}
              color="#020617"
            />
            <PaymentOption 
              type={PaymentMethod.ONECASH} 
              icon="fa-solid fa-money-bill-transfer" 
              title={t('onecash')} 
              details={[`الرقم: 772023660`, `الاسم: أمجد المقري`]}
              color="#EE2A24"
            />
          </div>
        </section>

        <section className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4 px-2">
             <i className="fa-solid fa-globe text-[#c4a76d] text-sm md:text-base"></i>
             <h3 className="text-[9px] md:text-[11px] font-black text-[#7a7a7a] uppercase tracking-[0.2em] md:tracking-[0.3em]">{t('visaMada')}</h3>
             <div className="h-px flex-1 bg-[#e0e0e0] dark:bg-white/5"></div>
          </div>
          <PaymentOption 
            type={PaymentMethod.CARD} 
            icon="fa-solid fa-credit-card" 
            title={lang === 'en' ? 'Global Cards' : 'الدفع بالبطاقة العالمية'} 
            subtitle="Mada, Visa, Mastercard"
            color="#c4a76d"
          />
        </section>

        {/* Confirmation Summary - Now following the flow, not floating */}
        <div className="bg-[#1a2b4c] p-6 md:p-8 rounded-3xl md:rounded-[3rem] shadow-3xl border border-white/10 flex flex-col items-center gap-4 md:gap-6 mt-8 md:mt-12">
          <div className="flex flex-col items-center">
            <span className="text-[8px] md:text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">{t('total')}</span>
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
              <p className="text-[8px] md:text-[10px] text-amber-500 font-bold uppercase mt-1 md:mt-2 text-center">
                {lang === 'ar' ? '* سيتم مراجعة وتعديل السعر النهائي من قبل الدعم' : '* Final price will be reviewed and updated by support'}
              </p>
            )}
          </div>
          
          <button 
            onClick={handlePay}
            disabled={isProcessing || cart.length === 0}
            className="w-full bg-[#c4a76d] text-[#1a2b4c] py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-sm md:text-xl hover:scale-[1.03] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 md:gap-3 shadow-2xl shadow-[#c4a76d]/20 uppercase tracking-tight"
          >
            {isProcessing ? (
              <i className="fa-solid fa-spinner fa-spin text-lg md:text-3xl"></i>
            ) : (
              <>
                <span>{lang === 'en' ? 'CONFIRM ORDER' : 'تأكيد الطلب الآن'}</span>
                <i className={`fa-solid ${lang === 'en' ? 'fa-arrow-right' : 'fa-arrow-left'} text-sm md:text-xl`}></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
