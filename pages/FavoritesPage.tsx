
import React, { useState, useEffect } from 'react';
import { Language, Category, LocalProduct } from '../types';
import { TRANSLATIONS } from '../constants';
import { DB } from '../services/storage';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

interface Props { lang: Language; }

const FavoritesPage: React.FC<Props> = ({ lang }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<LocalProduct | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toggleFavorite, isFavorite, favorites } = useFavorites();
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [cats, prods] = await Promise.all([
          DB.getCategories(),
          DB.getProducts()
        ]);
        setCategories(cats);
        setProducts(prods.filter(p => favorites.includes(p.id)));
      } catch (err) {
        console.error("Error loading favorites:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [favorites]);

  const handleAddToCart = (product: LocalProduct) => {
    if (!user) {
      alert(t('restricted'));
      return;
    }
    addToCart({
      id: Math.random().toString(36).substr(2, 9),
      storeId: 'boutique',
      name: lang === 'ar' ? product.nameAr : product.name,
      price: product.price,
      currency: 'SAR',
      imageUrl: product.imageUrl,
      quantity: 1,
      productUrl: `local://${product.id}`
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleToggleFavorite = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    toggleFavorite(productId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12 h-12 border-4 border-[#1a2b4c] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Loading Favorites...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-24">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-in">
           <i className="fa-solid fa-check-circle text-red-500 text-sm"></i>
           <span className="font-black uppercase text-[10px] tracking-widest">{lang === 'ar' ? 'تمت الإضافة!' : 'Added!'}</span>
        </div>
      )}

      {/* Favorites Header */}
      <div className="relative overflow-hidden bg-[#1a2b4c] p-8 rounded-[2.5rem] shadow-2xl border-b-[4px] border-[#c4a76d]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c4a76d] opacity-10 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white shadow-2xl">
            <i className="fa-solid fa-heart text-2xl animate-pulse"></i>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
              {lang === 'ar' ? 'المفضلة' : 'My Favorites'}
            </h2>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest opacity-80">
              {products.length} {lang === 'ar' ? 'منتج محفوظ' : 'Saved Items'}
            </p>
          </div>
        </div>
      </div>

      {/* Favorites Grid - Compact */}
      {products.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-[#1E293B] rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-white/5 space-y-4">
           <div className="w-16 h-16 bg-gray-50 dark:bg-[#0F172A] rounded-full mx-auto flex items-center justify-center text-gray-200 dark:text-white/5 shadow-inner">
             <i className="fa-solid fa-heart-crack text-3xl"></i>
           </div>
           <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{lang === 'en' ? 'No favorites yet' : 'قائمة المفضلة فارغة'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {products.map(product => (
            <div 
              key={product.id} 
              onClick={() => setSelectedProduct(product)}
              className="bg-white dark:bg-[#1E293B] rounded-[1.2rem] md:rounded-[1.8rem] p-2.5 md:p-3.5 border border-[#e0e0e0] dark:border-white/5 shadow-sm hover:shadow-2xl transition-all group overflow-hidden relative cursor-pointer"
            >
              <button 
                onClick={(e) => handleToggleFavorite(e, product.id)}
                className="absolute top-4 right-4 z-20 w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 active:scale-90 transition-all"
              >
                <i className="fa-solid fa-heart text-[10px]"></i>
              </button>

              <div className="aspect-square bg-[#f9f7f2] dark:bg-[#0F172A] rounded-[1rem] md:rounded-[1.2rem] overflow-hidden mb-3 relative group-hover:scale-105 transition-transform duration-500">
                <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-contain p-3 mix-blend-multiply dark:mix-blend-normal" />
              </div>
              
              <div className="space-y-1 text-center px-1">
                <span className="text-[7px] font-black text-[#c4a76d] uppercase tracking-widest">
                  {categories.find(c => c.id === product.categoryId)?.nameAr}
                </span>
                <h4 className="font-black text-[#1a2b4c] dark:text-white text-[10px] line-clamp-1">{lang === 'ar' ? product.nameAr : product.name}</h4>
                <div className="flex items-center justify-center gap-1 pt-1">
                  <span className="text-sm font-black text-[#1a2b4c] dark:text-white">{product.price}</span>
                  <span className="text-[7px] font-bold text-[#c4a76d] uppercase">SAR</span>
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                className="w-full mt-3 bg-[#1a2b4c] text-white py-2 rounded-lg text-[8px] font-black uppercase shadow-lg hover:bg-[#253b66] transition-all flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-cart-shopping"></i>
                {t('addToCart')}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-[#020617]/95 backdrop-blur-xl p-4 md:p-10 animate-fade-in overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="min-h-full flex items-center justify-center py-10">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] md:rounded-[4rem] shadow-3xl border border-white/5 overflow-hidden flex flex-col md:flex-row relative">
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-10 h-10 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors shadow-lg"
              >
                <i className="fa-solid fa-times"></i>
              </button>

              <div className="w-full md:w-1/2 bg-[#f9f7f2] dark:bg-slate-950 p-6 md:p-12 flex items-center justify-center shrink-0 min-h-[300px] md:min-h-0">
                 <img src={selectedProduct.imageUrl} className="w-full h-auto max-h-[400px] md:max-h-full object-contain drop-shadow-2xl" alt={selectedProduct.nameAr} />
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="p-8 md:p-12 space-y-8">
                  <div className="space-y-4 md:space-y-6">
                    <span className="bg-[#1a2b4c]/10 text-[#1a2b4c] px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block">
                      {categories.find(c => c.id === selectedProduct.categoryId)?.nameAr || 'Favorite'}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-[#1a2b4c] dark:text-white leading-tight">
                      {lang === 'ar' ? selectedProduct.nameAr : selectedProduct.name}
                    </h2>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black text-[#c4a76d]">{selectedProduct.price}</span>
                      <span className="text-sm font-bold text-slate-400 uppercase">SAR</span>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-white/5 w-16"></div>
                    
                    <div className="space-y-4">
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-line font-medium text-[#7a7a7a] dark:text-slate-400">
                        {lang === 'ar' ? selectedProduct.descriptionAr : selectedProduct.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleFavorite(selectedProduct.id)}
                        className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${isFavorite(selectedProduct.id) ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-400 hover:border-rose-500 hover:text-rose-500'}`}
                      >
                        <i className={`${isFavorite(selectedProduct.id) ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
                        {isFavorite(selectedProduct.id) ? (lang === 'ar' ? 'في المفضلة' : 'Favorited') : (lang === 'ar' ? 'إضافة للمفضلة' : 'Add to Favorites')}
                      </button>
                      
                      <button 
                        onClick={() => {
                          const text = lang === 'ar' 
                            ? `مرحباً، أود الاستفسار عن هذا المنتج: ${selectedProduct.nameAr} - السعر: ${selectedProduct.price} ريال`
                            : `Hello, I want to ask about this product: ${selectedProduct.name} - Price: ${selectedProduct.price} SAR`;
                          const phone = '+967774757728';
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="w-12 h-12 md:w-14 md:h-14 bg-green-500 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title={lang === 'ar' ? 'مشاركة للدعم الفني' : 'Share to Support'}
                      >
                        <i className="fa-brands fa-whatsapp text-xl md:text-2xl"></i>
                      </button>

                      <div className="relative">
                        <button 
                          onClick={() => setShowShareMenu(!showShareMenu)}
                          className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transition-all ${showShareMenu ? 'bg-[#1a2b4c] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:scale-110 active:scale-95'}`}
                          title={lang === 'ar' ? 'مشاركة' : 'Share'}
                        >
                          <i className="fa-solid fa-share-nodes text-xl md:text-2xl"></i>
                        </button>

                        {showShareMenu && (
                          <div className="absolute bottom-full mb-4 right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 min-w-[160px] animate-slide-up z-[60]">
                            <button 
                              onClick={() => {
                                const text = lang === 'ar' 
                                  ? `شاهد هذا المنتج الرائع: ${selectedProduct.nameAr} - السعر: ${selectedProduct.price} ريال`
                                  : `Check out this amazing product: ${selectedProduct.name} - Price: ${selectedProduct.price} SAR`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`, '_blank');
                                setShowShareMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-xl transition-colors text-green-600 font-black text-[10px] uppercase"
                            >
                              <i className="fa-brands fa-whatsapp text-lg"></i>
                              WhatsApp
                            </button>
                            <button 
                              onClick={() => {
                                const text = lang === 'ar' 
                                  ? `شاهد هذا المنتج الرائع: ${selectedProduct.nameAr}`
                                  : `Check out this amazing product: ${selectedProduct.name}`;
                                window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
                                setShowShareMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-blue-500 font-black text-[10px] uppercase"
                            >
                              <i className="fa-brands fa-telegram text-lg"></i>
                              Telegram
                            </button>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert(lang === 'ar' ? 'تم نسخ الرابط لمشاركته على انستجرام' : 'Link copied to share on Instagram');
                                setShowShareMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-rose-500 font-black text-[10px] uppercase"
                            >
                              <i className="fa-brands fa-instagram text-lg"></i>
                              Instagram
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-white/5 mx-2"></div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied');
                                setShowShareMenu(false);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-500 font-black text-[10px] uppercase"
                            >
                              <i className="fa-solid fa-link text-lg"></i>
                              {lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => { handleAddToCart(selectedProduct); setSelectedProduct(null); }}
                      className="w-full bg-[#1a2b4c] text-white py-5 md:py-6 rounded-2xl font-black text-sm md:text-lg uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <i className="fa-solid fa-cart-shopping"></i>
                      {t('addToCart')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
