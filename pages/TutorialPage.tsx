
import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  lang: Language;
  setView: (view: any) => void;
}

const TutorialPage: React.FC<Props> = ({ lang, setView }) => {
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  const steps = [
    {
      id: 1,
      icon: 'fa-magnifying-glass-location',
      title: lang === 'ar' ? 'اختر المتجر' : 'Pick a Store',
      desc: lang === 'ar' ? 'تصفح قائمة المتاجر العالمية المتاحة في التطبيق.' : 'Browse the list of available global stores in the app.',
      action: () => setView('home'),
      actionText: lang === 'ar' ? 'تصفح المتاجر' : 'Browse Stores',
      details: lang === 'ar' ? 'اختر من بين 13 متجراً عالمياً مثل أمازون، شي إن، وغيرها.' : 'Choose from 13 global stores like Amazon, SHEIN, and more.'
    },
    {
      id: 2,
      icon: 'fa-comments',
      title: lang === 'ar' ? 'تواصل معنا' : 'Contact Support',
      desc: lang === 'ar' ? 'زودنا برابط المنتج الذي تريده عبر الواتساب.' : 'Provide us with the product link you want via WhatsApp.',
      action: () => window.open('https://wa.me/967774757728', '_blank'),
      actionText: lang === 'ar' ? 'تحدث مع الدعم' : 'Talk to Support',
      details: lang === 'ar' ? 'فريقنا سيقوم بتقدير السعر النهائي شامل الشحن لليمن فوراً.' : 'Our team will estimate the final price including shipping to Yemen instantly.'
    },
    {
      id: 3,
      icon: 'fa-credit-card',
      title: lang === 'ar' ? 'الدفع المحلي' : 'Local Payment',
      desc: lang === 'ar' ? 'أكد طلبك وادفع عبر الكريمي أو ون كاش بكل سهولة.' : 'Confirm your order and pay via Kuraimi or OneCash easily.',
      action: () => setView('auth'),
      actionText: lang === 'ar' ? 'إنشاء حساب' : 'Create Account',
      details: lang === 'ar' ? 'لا حاجة لبطاقات دولية، ادفع بعملتك المحلية وبأمان تام.' : 'No need for international cards, pay in local currency safely.'
    },
    {
      id: 4,
      icon: 'fa-map-location-dot',
      title: lang === 'ar' ? 'تتبع واستلم' : 'Track & Receive',
      desc: lang === 'ar' ? 'تابع مسار شحنتك حتى تصل لباب بيتك في اليمن.' : 'Track your shipment until it reaches your door in Yemen.',
      action: () => setView('tracking'),
      actionText: lang === 'ar' ? 'ابدأ التتبع' : 'Track Now',
      details: lang === 'ar' ? 'خدمة لوجستية موحدة تضمن لك وصول طلبك في أسرع وقت.' : 'A unified logistics service that ensures your order arrives fast.'
    }
  ];

  const features = [
    { 
      i: 'fa-globe-asia', 
      title: lang === 'ar' ? 'متاجر عالمية' : 'Global Stores',
      t: lang === 'ar' ? 'تسوق من أشهر 13 متجراً عالمياً في مكان واحد.' : 'Shop from 13+ famous global stores in one place.' 
    },
    { 
      i: 'fa-wallet', 
      title: lang === 'ar' ? 'دفع محلي' : 'Local Payment',
      t: lang === 'ar' ? 'ادفع عبر الكريمي، ون كاش، أو جيب بكل سهولة.' : 'Pay via Kuraimi, OneCash, or Jeeb with ease.' 
    },
    { 
      i: 'fa-truck-fast', 
      title: lang === 'ar' ? 'شحن آمن' : 'Safe Shipping',
      t: lang === 'ar' ? 'نضمن وصول منتجاتك من المصدر إلى باب بيتك في اليمن.' : 'We guarantee your products reach your door in Yemen safely.' 
    },
    { 
      i: 'fa-shield-halved', 
      title: lang === 'ar' ? 'حماية كاملة' : 'Full Protection',
      t: lang === 'ar' ? 'فريقنا يتابع طلبك لحظة بلحظة حتى الاستلام.' : 'Our team tracks your order every step until it reaches you.' 
    }
  ];

  return (
    <div className="animate-fade-in space-y-16 md:space-y-24 pb-24 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-6">
        <h2 className="text-4xl md:text-7xl font-black text-[#1a2b4c] dark:text-white tracking-tighter uppercase leading-none">
          {t('howToOrder')}
        </h2>
        <p className="text-[#7a7a7a] dark:text-slate-400 text-sm md:text-xl font-bold uppercase tracking-widest opacity-80 max-w-3xl mx-auto">
          {lang === 'ar' ? 'دليلك الشامل للتسوق من أي مكان في العالم وأنت في منزلك في اليمن' : 'Your complete guide to shop from anywhere globally from your home in Yemen'}
        </p>
        <div className="w-48 h-2 bg-[#c4a76d] mx-auto rounded-full"></div>
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step) => (
          <div key={step.id} className="relative group">
            <div className="h-full bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border-2 border-[#e0e0e0] dark:border-white/5 shadow-xl hover:shadow-2xl transition-all space-y-8 flex flex-col">
              <div className="absolute -top-6 left-10 bg-[#c4a76d] text-[#1a2b4c] w-14 h-14 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-lg ring-8 ring-white dark:ring-[#020617] rotate-6 group-hover:rotate-0 transition-transform">
                0{step.id}
              </div>

              <div className="w-24 h-24 bg-[#f9f7f2] dark:bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-4xl text-[#c4a76d] shadow-inner group-hover:scale-110 transition-transform duration-500">
                <i className={`fa-solid ${step.icon}`}></i>
              </div>

              <div className="space-y-4 flex-1">
                <h3 className="text-2xl font-black text-[#1a2b4c] dark:text-white uppercase tracking-tight">
                  {step.title}
                </h3>
                <p className="text-xs text-[#7a7a7a] dark:text-slate-400 font-bold leading-relaxed uppercase tracking-wide">
                  {step.desc}
                </p>
                <div className="p-4 bg-[#f9f7f2] dark:bg-slate-950/50 rounded-2xl border border-[#e0e0e0] dark:border-white/5">
                  <p className="text-[10px] text-[#7a7a7a] font-medium italic">
                    {step.details}
                  </p>
                </div>
              </div>

              <button 
                onClick={step.action}
                className="w-full bg-[#1a2b4c] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#253b66] transition-all shadow-xl"
              >
                {step.actionText}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Why Section */}
      <div className="bg-[#1a2b4c] rounded-[4rem] md:rounded-[6rem] p-10 md:p-24 text-white border-b-[16px] border-[#c4a76d] relative overflow-hidden shadow-3xl">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#c4a76d] opacity-[0.05] rounded-full blur-[120px]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1 space-y-10">
            <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
              {lang === 'ar' ? 'لماذا تختار منصة كوليكشن؟' : 'Why Choose Collection?'}
            </h3>
            <div className="grid gap-6">
              {features.map((item, idx) => (
                <div key={idx} className="flex gap-6 items-center bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="w-14 h-14 bg-[#c4a76d] rounded-2xl shrink-0 flex items-center justify-center text-[#1a2b4c] transition-transform group-hover:scale-110">
                    <i className={`fa-solid ${item.i} text-2xl`}></i>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-black text-sm md:text-xl uppercase tracking-tight">
                      {item.title}
                    </h4>
                    <p className="text-white/60 text-[10px] md:text-sm font-bold opacity-80 leading-relaxed">
                      {item.t}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full lg:w-96 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-3xl p-12 rounded-[4rem] border border-white/20 space-y-8 text-center shadow-2xl">
             <div className="w-24 h-24 bg-[#c4a76d] rounded-full mx-auto flex items-center justify-center text-[#1a2b4c] text-4xl shadow-[0_0_50px_rgba(196,167,109,0.5)]">
               <i className="fa-solid fa-gem"></i>
             </div>
             <div className="space-y-3">
               <h4 className="font-black text-xl uppercase">{lang === 'ar' ? 'ابدأ رحلتك اليوم' : 'Start Today'}</h4>
               <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-loose">
                 {lang === 'ar' ? 'انضم لآلاف المتسوقين في اليمن الذين وثقوا بنا.' : 'Join thousands of shoppers in Yemen who trust us.'}
               </p>
             </div>
             <button onClick={() => setView('auth')} className="w-full bg-[#c4a76d] text-[#1a2b4c] py-6 rounded-2xl font-black text-sm uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
               {lang === 'ar' ? 'إنشاء حساب مجاني' : 'SIGN UP FREE'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialPage;
