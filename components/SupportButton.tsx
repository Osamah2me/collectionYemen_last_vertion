
import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

const SupportButton: React.FC<{ lang: Language }> = ({ lang }) => {
  const handleWhatsApp = () => {
    const phone = '+967774757728';
    const message = lang === 'en' ? 'Hello, I need support with Collection app' : 'مرحباً، أحتاج مساعدة في تطبيق كوليكشن';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  return (
    <button
      onClick={handleWhatsApp}
      className={`fixed bottom-6 ${lang === 'ar' ? 'left-6' : 'right-6'} md:bottom-10 ${lang === 'ar' ? 'md:left-10' : 'md:right-10'} z-[100] bg-[#25D366] text-white w-12 h-12 md:w-16 md:h-16 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group ring-4 md:ring-8 ring-white/5`}
    >
      <div className="flex items-center justify-center gap-0 group-hover:gap-3 transition-all duration-500">
        <i className="fa-brands fa-whatsapp text-2xl md:text-3xl"></i>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-[10px] md:text-xs font-black uppercase tracking-widest">
          {t('whatsappSupport')}
        </span>
      </div>
    </button>
  );
};

export default SupportButton;
