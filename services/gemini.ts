
import { GoogleGenAI, Type } from "@google/genai";

export const extractProductDetails = async (url: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Fix: Use gemini-3-pro-preview for higher accuracy in parsing complex E-commerce product pages
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this product URL: ${url}. 
      Your mission:
      1. Extract the EXACT full product title.
      2. Identify the CURRENT price after any discounts.
      3. Identify the original currency (USD, AED, TRY, etc.).
      4. MANDATORY: Convert the price to Saudi Riyal (SAR). Use these rates: 1 USD = 3.75 SAR, 1 AED = 1.02 SAR, 1 TRY = 0.11 SAR.
      5. CRITICAL: Find the high-quality DIRECT image URL (look for strings ending in .jpg, .png, .webp). Avoid placeholder images.
      6. Provide a short, persuasive marketing description in Arabic.`,
      config: {
        systemInstruction: "You are a specialized e-commerce data parser. Return ONLY a valid JSON object. Ensure the imageUrl is a direct link to the image source. If you cannot find a price, return 0. The output MUST follow the provided schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            price: { type: Type.NUMBER, description: "Final price in SAR" },
            currency: { type: Type.STRING, description: "Always SAR" },
            imageUrl: { type: Type.STRING, description: "Direct product image link" },
            description: { type: Type.STRING },
            storeName: { type: Type.STRING }
          },
          required: ["name", "price", "currency", "imageUrl"]
        }
      }
    });
    
    // Fix: Access .text as a property (not a method) per SDK guidelines
    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Smart Import Error:", error);
    return null;
  }
};
