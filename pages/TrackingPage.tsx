
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { DB, Order, OrderStatus } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface Props {
  lang: Language;
}

const TrackingPage: React.FC<Props> = ({ lang }) => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(false);
  const { user } = useAuth();

  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  useEffect(() => {
    if (user) {
      const fetchOrders = () => DB.getOrders(user.id).then(setRecentOrders);
      fetchOrders();
      // Auto-refresh recent orders every 20 seconds to catch admin price updates
      const interval = setInterval(fetchOrders, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (order && (order.status === 'pending' || order.status === 'awaiting_quote' || order.status === 'quote_ready')) {
      // If order is pending or awaiting quote, refresh it every 10 seconds to see if admin priced it or updated it
      interval = setInterval(async () => {
        const result = await DB.getOrderById(order.id);
        if (result) {
          // Check if anything significant changed (total, status, or items count/prices)
          const hasChanged = 
            result.total !== order.total || 
            result.status !== order.status || 
            JSON.stringify(result.items.map(i => i.price)) !== JSON.stringify(order.items.map(i => i.price));
          
          if (hasChanged) {
            setOrder(result);
          }
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [order]);

  const handleSearch = async (e?: React.FormEvent, specificId?: string) => {
    if (e) e.preventDefault();
    const idToSearch = specificId || orderId;
    if (!idToSearch) return;

    setIsSearching(true);
    setError(false);
    
    // Slight delay to simulate a network request for premium feel
    setTimeout(async () => {
      const result = await DB.getOrderById(idToSearch);
      if (result) {
        setOrder(result);
        setOrderId(idToSearch.toUpperCase());
      } else {
        setError(true);
        setOrder(null);
      }
      setIsSearching(false);
    }, 600);
  };

  const statusList: OrderStatus[] = ['awaiting_quote', 'quote_ready', 'pending', 'purchased', 'shipped', 'yemen', 'delivery', 'completed'];
  const getStatusIndex = (status: OrderStatus) => statusList.indexOf(status);

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <div className="text-center space-y-2 md:space-y-4">
        <h2 className="text-2xl md:text-4xl font-black text-[#1a2b4c] tracking-tighter uppercase">
          {t('trackOrder')}
        </h2>
        <p className="text-[#7a7a7a] font-medium text-[10px] md:text-sm">
          {t('enterOrderId')}
        </p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-xl border border-[#e0e0e0] max-w-lg mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text"
            placeholder={t('orderNumber')}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full px-4 md:px-8 py-4 md:py-6 rounded-xl md:rounded-3xl bg-gray-50 border-2 border-transparent focus:border-[#c4a76d] focus:bg-white outline-none transition-all font-black text-[#1a2b4c] uppercase pr-24 md:pr-40 text-xs md:text-base"
          />
          <button 
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-2 bottom-2 md:right-3 md:top-3 md:bottom-3 bg-[#1a2b4c] text-white px-4 md:px-8 rounded-lg md:rounded-2xl text-[10px] md:text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
          >
            {isSearching ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
            {t('track')}
          </button>
        </form>
      </div>

      {recentOrders.length > 0 && !order && (
        <div className="max-w-lg mx-auto space-y-4">
           <div className="flex items-center gap-3 px-4">
             <div className="h-px flex-1 bg-gray-200"></div>
             <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{lang === 'en' ? 'My Recent Orders' : 'طلباتي الأخيرة'}</span>
             <div className="h-px flex-1 bg-gray-200"></div>
           </div>
           <div className="flex flex-wrap gap-2 justify-center">
              {recentOrders.slice(0, 5).map(o => (
                <button 
                  key={o.id}
                  onClick={() => handleSearch(undefined, o.id)}
                  className="bg-white px-4 py-2 rounded-xl text-[10px] font-black border border-gray-100 hover:border-[#D4AF37] transition-all shadow-sm"
                >
                  #{o.id}
                </button>
              ))}
           </div>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto bg-red-50 p-6 rounded-3xl border border-red-100 text-red-600 text-center animate-bounce-in">
           <i className="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
           <p className="font-black">{t('orderNotFound')}</p>
        </div>
      )}

      {order && (
        <div className="bg-[#1a2b4c] text-white p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-2xl animate-slide-up relative overflow-hidden border-b-4 md:border-b-8 border-[#c4a76d]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c4a76d] opacity-5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          <div className="relative z-10 space-y-8 md:space-y-12">
            <div className="flex justify-between items-start border-b border-white/5 pb-4 md:pb-8">
              <div>
                <span className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">{t('orderNumber')}</span>
                <h3 className="text-lg md:text-2xl font-black text-[#c4a76d] uppercase">{order.id}</h3>
              </div>
              <div className="text-right">
                <span className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">{t('date')}</span>
                <p className="text-xs md:text-base font-bold text-gray-300">{new Date(order.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
              </div>
            </div>

            {/* Stepper Component */}
            <div className="relative pt-2 md:pt-4 overflow-x-auto no-scrollbar">
              <div className="grid grid-cols-6 min-w-[500px] md:min-w-[600px] gap-1 md:gap-2">
                {statusList.map((status, index) => {
                  const isActive = getStatusIndex(order.status) >= index;
                  const isCurrent = order.status === status;
                  return (
                    <div key={status} className="flex flex-col items-center text-center gap-2 md:gap-4 relative">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 z-10 ${
                        isActive 
                          ? 'bg-[#c4a76d] text-[#1a2b4c] shadow-[0_0_20px_rgba(196,167,109,0.4)] rotate-3' 
                          : 'bg-white/5 text-gray-600 grayscale'
                      } ${isCurrent ? 'ring-2 md:ring-4 ring-white/10 scale-110' : ''}`}>
                        <i className={`fa-solid ${
                          status === 'awaiting_quote' ? 'fa-file-invoice-dollar' :
                          status === 'quote_ready' ? 'fa-hand-holding-dollar' :
                          status === 'pending' ? 'fa-hourglass-start' : 
                          status === 'purchased' ? 'fa-bag-shopping' : 
                          status === 'shipped' ? 'fa-plane-up' : 
                          status === 'yemen' ? 'fa-warehouse' : 
                          status === 'delivery' ? 'fa-truck-fast' : 'fa-check-double'
                        } text-base md:text-lg`}></i>
                      </div>
                      <div className="space-y-1">
                        <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-[#c4a76d]' : 'text-gray-600'}`}>
                          {t(`status_${status}`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-between">
               <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#c4a76d] rounded-xl md:rounded-2xl flex items-center justify-center text-[#1a2b4c]">
                     <i className="fa-solid fa-box-archive text-base md:text-xl"></i>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-widest">{t('items')}</p>
                    <p className="text-xs md:text-base font-bold">{order.items.length} {t('productsCount')}</p>
                  </div>
               </div>
               <div className="text-center md:text-right w-full md:w-auto border-y md:border-y-0 border-white/5 py-3 md:py-0">
                  <p className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-widest">{t('paymentMethod')}</p>
                  <p className="text-xs md:text-base font-bold text-[#c4a76d]">{t(order.paymentMethod)}</p>
               </div>
               <div className="w-full md:w-auto">
                  <p className="text-[8px] md:text-[10px] text-white/40 font-black uppercase tracking-widest text-center md:text-left">{t('totalValue')}</p>
                  <div className="flex items-center justify-center md:justify-start gap-2 md:gap-3">
                    <p className="text-xl md:text-2xl font-black text-[#c4a76d]">{order.total.toFixed(2)} SAR</p>
                    <button 
                      onClick={() => handleSearch(undefined, order.id)}
                      className="p-1.5 md:p-2 text-white/40 hover:text-[#c4a76d] transition-colors"
                      title={t('refresh')}
                    >
                      <i className="fa-solid fa-rotate text-[10px] md:text-xs"></i>
                    </button>
                  </div>
               </div>
            </div>

            {/* Items List for Customer */}
            <div className="space-y-4">
              <h4 className="text-[10px] md:text-xs font-black text-white/60 uppercase tracking-[0.2em] px-2">
                {t('orderDetails')}
              </h4>
              <div className="grid gap-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-white/10 border border-white/10">
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      <div>
                        <h5 className="text-[11px] md:text-sm font-black text-white line-clamp-1">{item.name}</h5>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] md:text-[10px] text-[#c4a76d] font-black uppercase tracking-widest">
                            {item.price > 0 ? `${item.price} SAR` : t('awaitingQuote')}
                          </span>
                          <span className="text-[9px] md:text-[10px] text-white/40 font-bold">x{item.quantity}</span>
                        </div>
                        {item.productUrl && (
                          <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-[8px] md:text-[9px] text-blue-400 hover:underline flex items-center gap-1 mt-1">
                            <i className="fa-solid fa-external-link"></i>
                            {t('viewLink')}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs md:text-lg font-black text-white">
                        {(item.price * item.quantity).toFixed(2)} <span className="text-[8px] md:text-[10px] text-white/40">SAR</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {order.status === 'awaiting_quote' && (
              <div className="bg-amber-500/10 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-amber-500/20 flex flex-col items-center gap-4 md:gap-6 mt-6 md:mt-8">
                <div className="text-center space-y-1 md:space-y-2">
                  <h4 className="text-base md:text-lg font-black text-amber-500 uppercase tracking-tight">
                    {t('awaitingQuote')}
                  </h4>
                  <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                    {t('awaitingPricingDesc')}
                  </p>
                </div>
              </div>
            )}

            {order.status === 'quote_ready' && (
              <div className="bg-green-500/10 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-green-500/20 flex flex-col items-center gap-4 md:gap-6 mt-6 md:mt-8">
                <div className="text-center space-y-1 md:space-y-2">
                  <h4 className="text-base md:text-lg font-black text-green-500 uppercase tracking-tight">
                    {t('quoteReadyTitle')}
                  </h4>
                  <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                    {t('quoteReadyDesc')}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[7px] text-gray-500 font-black uppercase mb-1">Kuraimi</p>
                    <p className="text-[9px] font-black">1570812</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[7px] text-gray-500 font-black uppercase mb-1">Jeeb</p>
                    <p className="text-[9px] font-black">774757728</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                    <p className="text-[7px] text-gray-500 font-black uppercase mb-1">OneCash</p>
                    <p className="text-[9px] font-black">772023660</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const text = t('whatsappPaymentMsg') + order.id + t('whatsappPaymentTotal') + order.total + t('whatsappPaymentCurrency');
                    const phone = '+967774757728';
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="bg-green-500 text-white px-6 md:px-10 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 md:gap-3 w-full justify-center"
                >
                  <i className="fa-brands fa-whatsapp text-lg md:text-xl"></i>
                  {t('sendReceipt')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingPage;
