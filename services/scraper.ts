
export interface ScrapedProduct {
  name: string;
  price: number;
  imageUrl: string;
  currency: string;
  url: string;
}

// عنوان خادم Node.js الخاص بك (يمكنك تغييره عند الرفع على سيرفر حقيقي)
const BACKEND_SCRAPER_URL = 'http://localhost:3000/scrape';

export const fetchRealProductDetails = async (url: string): Promise<ScrapedProduct | null> => {
  // 1. محاولة الجلب من خادم Node.js (المحرك الاحترافي)
  try {
    const response = await fetch(BACKEND_SCRAPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("Backend Scraper not reachable, falling back to public proxy...");
  }

  // 2. المحاولة عبر AllOrigins (الاحتياط في حال تعطل السيرفر)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const getMeta = (prop: string) => 
      doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
      doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') || '';

    const rawPrice = getMeta('product:price:amount') || 
                     getMeta('og:price:amount') || 
                     doc.querySelector('.price, [class*="price"]')?.textContent?.replace(/[^0-9.]/g, '') || '0';

    return {
      name: getMeta('og:title') || doc.title || 'Product Name Not Found',
      price: parseFloat(rawPrice) || 0,
      imageUrl: getMeta('og:image') || getMeta('twitter:image') || '',
      currency: getMeta('product:price:currency') || getMeta('og:price:currency') || 'SAR',
      url: url
    };
  } catch (error) {
    console.error("All Scraping attempts failed:", error);
    return null;
  }
};

export const checkBackendStatus = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(BACKEND_SCRAPER_URL, { method: 'OPTIONS', signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
};

export const INJECTION_SCRIPT = `
(function() {
  if (window.collectionInjected) return;
  window.collectionInjected = true;
  const btn = document.createElement('div');
  btn.id = 'collection-floating-btn';
  btn.innerHTML = '<span>إضافة إلى سلة كوليكشن</span> <i class="fas fa-plus-circle"></i>';
  const styles = {
    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '999999', background: '#0F172A', color: '#D4AF37', padding: '16px 32px',
    borderRadius: '50px', fontWeight: '900', boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', border: '2px solid #D4AF37'
  };
  Object.assign(btn.style, styles);
  btn.onclick = function() {
    this.innerHTML = 'جاري الإضافة...';
    const productData = {
      name: document.querySelector('meta[property="og:title"]')?.content || document.title,
      price: document.querySelector('meta[property="product:price:amount"]')?.content || '0',
      imageUrl: document.querySelector('meta[property="og:image"]')?.content || '',
      url: window.location.href,
      type: 'COLLECTION_IMPORT'
    };
    if (window.parent) window.parent.postMessage(productData, "*");
  };
  document.body.appendChild(btn);
})();
`;
