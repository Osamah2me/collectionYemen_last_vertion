
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';

interface Review {
  id: number;
  name: string;
  nameAr: string;
  comment: string;
  commentAr: string;
  rating: number;
}

const REVIEWS_DATA: Review[] = [
  {
    id: 1,
    name: "Ahmed Al-Saadi",
    nameAr: "أحمد السعدي",
    comment: "Excellent service and fast delivery. The products are high quality.",
    commentAr: "خدمة ممتازة وتوصيل سريع. المنتجات ذات جودة عالية.",
    rating: 5
  },
  {
    id: 2,
    name: "Sara Mohammed",
    nameAr: "سارة محمد",
    comment: "I love the variety of products. Highly recommended!",
    commentAr: "أحب تنوع المنتجات. أنصح به بشدة!",
    rating: 5
  },
  {
    id: 3,
    name: "Hassan Ali",
    nameAr: "حسن علي",
    comment: "The best store in Yemen for international products.",
    commentAr: "أفضل متجر في اليمن للمنتجات العالمية.",
    rating: 4
  },
  {
    id: 4,
    name: "Amal Saleh",
    nameAr: "أمل صالح",
    comment: "Great customer support and easy tracking system.",
    commentAr: "دعم عملاء رائع ونظام تتبع سهل.",
    rating: 5
  }
];

export const CustomerReviews: React.FC<{ lang: Language }> = ({ lang }) => {
  const [reviews, setReviews] = useState<Review[]>(REVIEWS_DATA);
  const [index, setIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newReview, setNewReview] = useState({ name: '', comment: '', rating: 5 });

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % reviews.length);
    }, 4000); // Slowed down to 4 seconds
    return () => clearInterval(timer);
  }, [reviews.length]);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now();
    const review: Review = {
      id,
      name: newReview.name,
      nameAr: newReview.name,
      comment: newReview.comment,
      commentAr: newReview.comment,
      rating: newReview.rating
    };
    setReviews([review, ...reviews]);
    setShowForm(false);
    setNewReview({ name: '', comment: '', rating: 5 });
    setIndex(0);
  };

  const review = reviews[index];

  return (
    <div className="py-8 bg-slate-50 dark:bg-slate-950/50 overflow-hidden border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h3 className="text-lg md:text-xl font-black text-[#1a2b4c] dark:text-white uppercase tracking-widest">
            {lang === 'ar' ? 'آراء العملاء' : 'Customer Reviews'}
          </h3>
          <div className="w-10 h-1 bg-[#c4a76d] mx-auto mt-1.5 rounded-full"></div>
        </div>

        <div className="relative h-28 md:h-32 flex items-center justify-center mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute w-full max-w-xl text-center px-4"
            >
              <div className="flex justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className={`fa-solid fa-star text-[10px] ${i < review.rating ? 'text-[#c4a76d]' : 'text-slate-300'}`}></i>
                ))}
              </div>
              <p className="text-xs md:text-base font-bold text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{lang === 'ar' ? review.commentAr : review.comment}"
              </p>
              <h4 className="mt-3 text-[9px] md:text-[11px] font-black text-[#1a2b4c] dark:text-[#c4a76d] uppercase tracking-widest">
                — {lang === 'ar' ? review.nameAr : review.name}
              </h4>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#1a2b4c] text-white px-6 py-2.5 rounded-xl font-black text-[9px] md:text-[11px] uppercase tracking-widest shadow-lg hover:bg-[#253b66] active:scale-95 transition-all flex items-center gap-2.5 mx-auto border border-white/10"
          >
            <i className="fa-solid fa-comment-dots text-[#c4a76d] text-[10px]"></i>
            {lang === 'ar' ? 'أضف تقييمك' : 'Add Your Review'}
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-[280px] p-5 md:p-6 rounded-2xl shadow-2xl border border-[#c4a76d]/20"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-[#1a2b4c] dark:text-white uppercase tracking-tighter">
                  {lang === 'ar' ? 'أضف تقييمك' : 'Add Your Review'}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <i className="fa-solid fa-times text-base"></i>
                </button>
              </div>
              <form onSubmit={handleAddReview} className="space-y-3">
                <input 
                  type="text" 
                  placeholder={lang === 'ar' ? 'الاسم' : 'Name'} 
                  required 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 p-3 rounded-lg text-xs font-bold outline-none focus:border-[#c4a76d]"
                  value={newReview.name}
                  onChange={e => setNewReview({...newReview, name: e.target.value})}
                />
                <textarea 
                  placeholder={lang === 'ar' ? 'رأيك' : 'Your Review'} 
                  required 
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 p-3 rounded-lg text-xs font-bold outline-none focus:border-[#c4a76d] resize-none"
                  value={newReview.comment}
                  onChange={e => setNewReview({...newReview, comment: e.target.value})}
                ></textarea>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">{lang === 'ar' ? 'التقييم:' : 'Rating:'}</span>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(star => (
                      <button 
                        key={star} 
                        type="button"
                        onClick={() => setNewReview({...newReview, rating: star})}
                        className={`text-base ${star <= newReview.rating ? 'text-[#c4a76d]' : 'text-slate-200'}`}
                      >
                        <i className="fa-solid fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#1a2b4c] text-white py-3 rounded-lg font-black uppercase tracking-widest shadow-lg hover:bg-[#253b66] transition-all text-[10px]">
                  {lang === 'ar' ? 'إرسال التقييم' : 'Submit Review'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
