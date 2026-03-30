
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Language, Category, LocalProduct } from '../types';
import { TRANSLATIONS } from '../constants';
import { DB } from '../services/storage';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

interface Props { 
  lang: Language; 
  showOnlyDiscounted?: boolean;
  showOnlyFlashSale?: boolean;
  showOnlyOffers?: boolean;
  initialProductId?: string;
}

const CatalogPage: React.FC<Props> = ({ lang, showOnlyDiscounted, showOnlyFlashSale, showOnlyOffers, initialProductId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<LocalProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string } | null>(null);
  
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [cats, prods] = await Promise.all([
          DB.getCategories(),
          DB.getProducts()
        ]);
        setCategories(cats.filter(c => !c.isBride));
        setProducts(prods);
        if (initialProductId) {
          const prod = prods.find(p => p.id === initialProductId);
          if (prod) setSelectedProduct(prod);
        }
      } catch (err) {
        console.error("Error loading catalog:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts = products.filter(p => {
    if (p.isBride) return false;
    if (showOnlyDiscounted && !p.isDiscounted) return false;
    if (showOnlyFlashSale && !p.isFlashSale) return false;
    if (showOnlyOffers && !p.isOffer && !p.isDiscounted) return false;
    const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
    const matchesSearch = p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: LocalProduct, size?: string | null, color?: { name: string; hex: string } | null) => {
    if (!user) {
      toast.error(t('restricted'));
      return;
    }

    if (product.sizes && product.sizes.length > 0 && !size) {
      toast.error(t('selectSize'));
      return;
    }

    if (product.colors && product.colors.length > 0 && !color) {
      toast.error(t('selectColor'));
      return;
    }

    if (size) {
      const sizeObj = product.sizes?.find(s => s.name === size);
      if (sizeObj && !sizeObj.isAvailable) {
        toast.error(lang === 'ar' ? 'هذا المقاس غير متوفر حالياً' : 'This size is currently out of stock');
        return;
      }
    }

    if (color) {
      const colorObj = product.colors?.find(c => c.name === color.name);
      if (colorObj && !colorObj.isAvailable) {
        toast.error(lang === 'ar' ? 'هذا اللون غير متوفر حالياً' : 'This color is currently out of stock');
        return;
      }
    }

    addToCart({
      id: Math.random().toString(36).substr(2, 9),
      storeId: 'collection_store',
      name: lang === 'ar' ? product.nameAr : product.name,
      price: product.price,
      currency: 'SAR',
      imageUrl: product.imageUrl,
      quantity: 1,
      productUrl: `local://${product.id}`,
      selectedSize: size || undefined,
      selectedColor: color || undefined
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 md:py-60 gap-4 md:gap-6 text-center">
        <div className="w-10 h-10 md:w-16 md:h-16 border-[4px] md:border-[6px] border-[#1a2b4c] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] md:text-[10px]">{t('accessingStore')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 md:space-y-16">
      {/* Search Header - Responsive */}
      <div className="relative overflow-hidden bg-[#1a2b4c] p-6 md:p-16 rounded-2xl md:rounded-[4rem] shadow-3xl border-b-4 md:border-b-8 border-[#c4a76d]">
        <div className="absolute top-0 right-0 w-40 md:w-[40rem] h-40 md:h-[40rem] bg-[#c4a76d] opacity-[0.05] rounded-full blur-[60px] md:blur-[100px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
          <div className="text-center md:text-right">
            <h2 className="text-xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
              {showOnlyFlashSale ? t('flashSaleTitle') : 
               showOnlyOffers ? t('specialOffersTitle') : 
               showOnlyDiscounted ? t('flashSale') : t('localStore')}
            </h2>
            <p className="text-white/60 text-[8px] md:text-lg font-bold uppercase tracking-widest mt-1 md:mt-2">
              {showOnlyDiscounted ? t('flashSaleSubtitle') : t('catalogSubtitle')}
            </p>
          </div>
          <div className="w-full md:w-auto">
            <div className="relative">
              <input 
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 bg-white/10 border border-white/20 rounded-lg md:rounded-[1.5rem] py-2.5 md:py-5 px-10 md:px-12 text-white outline-none focus:border-[#c4a76d] transition-all font-bold text-[10px] md:text-sm"
              />
              <i className="fa-solid fa-search absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-white/40 text-[10px] md:text-sm"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-12">
        {/* Categories Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4 md:space-y-6">
          <h3 className="hidden lg:block font-black text-slate-900 dark:text-white uppercase tracking-widest text-[11px] px-3 opacity-50">
            {t('collections')}
          </h3>
          <div className="flex lg:flex-col gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 lg:pb-0 px-2 lg:px-0">
            <button 
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 py-2 md:py-4 rounded-lg md:rounded-2xl transition-all font-black text-[8px] md:text-[10px] uppercase tracking-wider whitespace-nowrap border-2 ${!selectedCategoryId ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-lg shadow-[#1a2b4c]/20' : 'bg-white dark:bg-slate-900 text-[#7a7a7a] border-[#e0e0e0] dark:border-white/5'}`}
            >
              {t('allProducts')}
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 md:py-4 rounded-lg md:rounded-2xl transition-all font-black text-[8px] md:text-[10px] uppercase tracking-wider whitespace-nowrap border-2 ${selectedCategoryId === cat.id ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-lg shadow-[#1a2b4c]/20' : 'bg-white dark:bg-slate-900 text-[#7a7a7a] border-[#e0e0e0] dark:border-white/5'}`}
              >
                {lang === 'ar' ? cat.nameAr : cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-4">
            {filteredProducts.map(product => {
              const favorited = isFavorite(product.id);
              return (
                <div key={product.id} className="bg-white dark:bg-slate-900 p-1 md:p-2 rounded-lg md:rounded-2xl border border-[#e0e0e0] dark:border-white/5 shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-full">
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }} className={`absolute top-1.5 right-1.5 z-20 w-6 h-6 md:w-8 md:h-8 rounded-md flex items-center justify-center transition-all ${favorited ? 'bg-[#c4a76d] text-[#1a2b4c]' : 'bg-slate-100 dark:bg-slate-950 text-slate-300 hover:text-[#c4a76d]'}`}>
                    <i className={`${favorited ? 'fa-solid' : 'fa-regular'} fa-heart text-[8px] md:text-xs`}></i>
                  </button>
                  <div className="aspect-square bg-[#f9f7f2] dark:bg-slate-950 rounded-md md:rounded-xl overflow-hidden mb-1.5 p-1 md:p-3 cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    <img src={product.imageUrl} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="flex-1 space-y-0.5 px-1">
                    <h4 className="font-bold text-[#1a2b4c] dark:text-white text-[8px] md:text-[11px] leading-tight line-clamp-2 uppercase">
                      {lang === 'ar' ? product.nameAr : product.name}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[#c4a76d] font-black text-[9px] md:text-sm">{product.price} SAR</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAddToCart(product)} 
                    className="w-full bg-[#1a2b4c] text-white py-1.5 md:py-2.5 rounded-md text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all mt-2"
                  >
                    {t('addToCart')}
                  </button>
                </div>
              );
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-20 opacity-40 space-y-4">
              <i className="fa-solid fa-box-open text-5xl"></i>
              <p className="font-black text-sm uppercase tracking-widest">{t('noProducts')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-[#1a2b4c]/90 backdrop-blur-lg p-2 md:p-6 animate-fade-in flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl md:rounded-2xl shadow-3xl border border-white/5 flex flex-col md:flex-row relative max-h-[95vh] overflow-visible">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-2 right-2 md:top-6 md:right-6 z-50 w-7 h-7 md:w-9 md:h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors shadow-lg"
            >
              <i className="fa-solid fa-times text-sm md:text-lg"></i>
            </button>

            <div className="w-full md:w-1/2 bg-[#f9f7f2] dark:bg-slate-950 p-4 md:p-10 flex items-center justify-center shrink-0 min-h-[180px] md:min-h-0 rounded-t-xl md:rounded-t-none md:rounded-l-2xl overflow-hidden">
               <img src={selectedProduct.imageUrl} className="w-full h-full max-h-[160px] md:max-h-none object-contain drop-shadow-2xl" alt="" />
            </div>
            
            <div className="flex-1 flex flex-col h-full overflow-hidden rounded-b-xl md:rounded-b-none md:rounded-r-2xl">
              <div className="flex-1 overflow-hidden p-4 md:p-8 space-y-3 md:space-y-4">
                <div className="space-y-1.5 md:space-y-3">
                  <span className="bg-[#1a2b4c]/10 text-[#1a2b4c] px-2 py-0.5 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-widest inline-block border border-[#1a2b4c]/20">
                    {categories.find(c => c.id === selectedProduct.categoryId)?.nameAr || 'Product'}
                  </span>
                  <h2 className="text-base md:text-2xl font-black text-[#1a2b4c] dark:text-white leading-tight uppercase">
                    {lang === 'ar' ? selectedProduct.nameAr : selectedProduct.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-lg md:text-2xl font-black text-[#c4a76d]">{selectedProduct.price} SAR</span>
                  </div>
                  
                  <div className="h-px bg-slate-100 dark:bg-white/5 w-10"></div>
                  
                  {/* Variant Selection */}
                  <div className="space-y-4 md:space-y-6 py-2">
                    {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                      <div className="space-y-2 md:space-y-3">
                        <h4 className="text-[10px] md:text-xs font-black text-[#1a2b4c] dark:text-white uppercase tracking-widest">
                          {t('selectSize')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.sizes.map(size => (
                            <button
                              key={size.name}
                              disabled={!size.isAvailable}
                              onClick={() => setSelectedSize(size.name)}
                              className={`min-w-[40px] md:min-w-[50px] h-10 md:h-12 border-2 rounded-lg font-black text-[10px] md:text-xs transition-all flex items-center justify-center ${
                                selectedSize === size.name 
                                  ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-lg' 
                                  : size.isAvailable 
                                    ? 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-white/5 hover:border-[#c4a76d]'
                                    : 'bg-gray-100 dark:bg-slate-800 text-slate-300 border-transparent cursor-not-allowed opacity-50'
                              }`}
                            >
                              {size.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                      <div className="space-y-2 md:space-y-3">
                        <h4 className="text-[10px] md:text-xs font-black text-[#1a2b4c] dark:text-white uppercase tracking-widest">
                          {t('selectColor')}
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {selectedProduct.colors.map(color => (
                            <button
                              key={color.hex}
                              disabled={!color.isAvailable}
                              onClick={() => setSelectedColor(color)}
                              className={`group relative flex flex-col items-center gap-1.5 ${!color.isAvailable ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                              <div 
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                                  selectedColor?.hex === color.hex 
                                    ? 'border-[#c4a76d] scale-110 shadow-lg' 
                                    : 'border-transparent hover:border-[#c4a76d]/30'
                                }`}
                                style={{ backgroundColor: color.hex }}
                              >
                                {selectedColor?.hex === color.hex && (
                                  <i className="fa-solid fa-check text-white text-[10px] drop-shadow-md"></i>
                                )}
                                {!color.isAvailable && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-[1px] bg-red-500 rotate-45"></div>
                                  </div>
                                )}
                              </div>
                              <span className={`text-[7px] md:text-[9px] font-bold uppercase tracking-tighter transition-colors ${
                                selectedColor?.hex === color.hex ? 'text-[#c4a76d]' : 'text-slate-400'
                              }`}>
                                {color.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] md:text-sm leading-relaxed font-medium text-[#7a7a7a] dark:text-slate-400 line-clamp-4 md:line-clamp-6">
                    {lang === 'ar' ? selectedProduct.descriptionAr : selectedProduct.description}
                  </p>
                </div>
              </div>

              {/* Fixed Action Footer */}
              <div className="p-3 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 space-y-2 md:space-y-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shadow-md transition-all ${isFavorite(selectedProduct.id) ? 'bg-[#c4a76d] text-[#1a2b4c]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                  >
                    <i className={`${isFavorite(selectedProduct.id) ? 'fa-solid' : 'fa-regular'} fa-heart text-xs md:text-base`}></i>
                  </button>

                  <div className="relative flex-1">
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className={`w-full h-8 md:h-10 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all ${showShareMenu ? 'bg-[#1a2b4c] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                      <i className="fa-solid fa-share-nodes text-xs md:text-sm"></i>
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{t('share')}</span>
                    </button>

                    {showShareMenu && (
                      <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-lg shadow-2xl p-1.5 flex items-center justify-around animate-slide-up z-[100]">
                        <button 
                          onClick={() => {
                            const text = lang === 'ar' ? `شاهد هذا المنتج: ${selectedProduct.nameAr}` : `Check this: ${selectedProduct.name}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + window.location.href)}`, '_blank');
                            setShowShareMenu(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-green-500 text-white rounded-md hover:scale-110 transition-transform"
                        >
                          <i className="fa-brands fa-whatsapp text-xs"></i>
                        </button>
                        <button 
                          onClick={() => {
                            window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(selectedProduct.name)}`, '_blank');
                            setShowShareMenu(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-[#0088cc] text-white rounded-md hover:scale-110 transition-transform"
                        >
                          <i className="fa-brands fa-telegram text-xs"></i>
                        </button>
                        <button 
                          onClick={() => {
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
                            setShowShareMenu(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-[#1877f2] text-white rounded-md hover:scale-110 transition-transform"
                        >
                          <i className="fa-brands fa-facebook-f text-xs"></i>
                        </button>
                        <button 
                          onClick={() => {
                            window.open('https://www.instagram.com/', '_blank');
                            setShowShareMenu(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-md hover:scale-110 transition-transform"
                        >
                          <i className="fa-brands fa-instagram text-xs"></i>
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success(t('linkCopied'));
                            setShowShareMenu(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-slate-200 text-slate-600 rounded-md hover:scale-110 transition-transform"
                        >
                          <i className="fa-solid fa-copy text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => { 
                    handleAddToCart(selectedProduct, selectedSize, selectedColor); 
                    if (!user) return;
                    if (selectedProduct.sizes && selectedProduct.sizes.length > 0 && !selectedSize) return;
                    if (selectedProduct.colors && selectedProduct.colors.length > 0 && !selectedColor) return;
                    setSelectedProduct(null);
                    setSelectedSize(null);
                    setSelectedColor(null);
                  }}
                  className="w-full bg-[#1a2b4c] text-white py-2.5 md:py-4 rounded-lg font-black text-[8px] md:text-base uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-cart-shopping text-xs"></i>
                  {t('addToCart')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPage;
