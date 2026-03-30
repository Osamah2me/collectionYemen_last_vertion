
import React, { useEffect, useState } from 'react';
import { APP_LOGO } from '../constants';

const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#1a2b4c] transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#c4a76d] opacity-[0.05] rounded-full -mr-48 -mt-48 blur-[180px]"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#c4a76d] opacity-[0.02] rounded-full -ml-32 -mb-32 blur-[120px]"></div>

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Animated Logo Container with Gold Glow */}
        <div className="w-36 h-36 md:w-52 md:h-52 bg-white/5 backdrop-blur-3xl p-8 rounded-[4rem] border border-[#c4a76d]/20 shadow-[0_0_80px_rgba(196,167,109,0.25)] animate-bounce-in flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[#c4a76d] opacity-5 blur-2xl rounded-full animate-pulse"></div>
          <img 
            src={APP_LOGO} 
            alt="Collection Logo" 
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_30px_rgba(196,167,109,0.6)] animate-pulse"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://img.icons8.com/ios-filled/200/c4a76d/crown.png";
            }}
          />
        </div>

        {/* Brand Name with Enhanced Gold Styling */}
        <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.25em] text-[#c4a76d] uppercase leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#f9f7f2] to-[#c4a76d]">
            COLLECTION
          </h1>
          <span className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-[0.8em] mt-4 opacity-80">
            Premium Global Retail
          </span>
        </div>

        {/* Luxury Progress Bar */}
        <div className="w-56 h-1 bg-white/5 rounded-full mt-12 overflow-hidden relative border border-white/5">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-[#c4a76d] via-[#f9f7f2] to-transparent w-full animate-loading-bar"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
