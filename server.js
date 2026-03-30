
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * محرك البحث والاستخراج المتقدم
 */
app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  console.log(`[Scraper] Processing: ${url}`);
  let browser;

  try {
    // إطلاق المتصفح
    browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // محاكاة متصفح حقيقي لتجنب الحظر
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // الانتقال للرابط والانتظار حتى استقرار الشبكة
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // استخراج البيانات من داخل DOM المتصفح
    const productData = await page.evaluate(() => {
      const getMeta = (p) => document.querySelector(`meta[property="${p}"], meta[name="${p}"]`)?.content;
      
      // محاولة العثور على السعر في عناصر شائعة إذا لم يوجد في Meta
      let priceText = '';
      const priceSelectors = [
        '[class*="price-amount"]', 
        '.a-price-whole', 
        '.price', 
        '[class*="price"]', 
        '.selling-price',
        '.pdp-price'
      ];

      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText) {
          priceText = el.innerText;
          break;
        }
      }

      // تنظيف السعر من العملات والرموز
      const cleanPrice = priceText.replace(/[^0-9.]/g, '');

      return {
        name: getMeta('og:title') || document.title,
        price: parseFloat(cleanPrice) || 0,
        imageUrl: getMeta('og:image') || getMeta('twitter:image') || '',
        currency: getMeta('product:price:currency') || getMeta('og:price:currency') || 'SAR',
        url: window.location.href
      };
    });

    console.log(`[Scraper] Success: ${productData.name}`);
    res.json(productData);

  } catch (err) {
    console.error(`[Scraper] Error: ${err.message}`);
    res.status(500).json({ error: 'Failed to scrape product data', details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🚀 Collection Scraper Engine is Running!
  ---------------------------------------
  Endpoint: http://localhost:${PORT}/scrape
  Method: POST
  Body: { "url": "PRODUCT_URL" }
  ---------------------------------------
  `);
});
