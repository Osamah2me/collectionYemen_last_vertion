
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { TRANSLATIONS, APP_LOGO } from '../constants';
import { DB, Order } from '../services/storage';

interface Props {
  lang: Language;
  onAuthSuccess: () => void;
  setView?: (v: any) => void;
}

const AuthPage: React.FC<Props> = ({ lang, onAuthSuccess, setView }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const { login, signup, user, logout, isLoading, loginWithGoogle } = useAuth();
  const { requestPermission, permission, addNotification } = useNotifications();
  
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  useEffect(() => {
    const fetchOrders = async () => {
      if (user) {
        const userOrders = await DB.getOrders(user.id);
        setOrders(userOrders);
      }
    };
    fetchOrders();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(email, pass);
        addNotification({
          title: 'Welcome Back!',
          titleAr: 'مرحباً بك مجدداً!',
          message: `Glad to see you again, ${email.split('@')[0]}!`,
          messageAr: `سعداء برؤيتك مرة أخرى يا ${email.split('@')[0]}!`,
          type: 'welcome'
        });
      } else {
        await signup(name, email, pass);
        addNotification({
          title: 'Welcome to Collection!',
          titleAr: 'مرحباً بك في كوليكشن!',
          message: 'Explore our global stores and local deals.',
          messageAr: 'استكشف متاجرنا العالمية وعروضنا المحلية الآن.',
          type: 'welcome'
        });
      }
      onAuthSuccess();
    } catch (err) {
      alert("Authentication failed. Please check your credentials.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      onAuthSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  if (user) {
    return (
      <div className="space-y-8 animate-fade-in pb-20">
        <div className="bg-[#1a2b4c] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c4a76d] opacity-10 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center p-4 shadow-2xl overflow-hidden ring-4 ring-[#c4a76d]/20">
              <img src={APP_LOGO} className="w-full h-full object-contain" alt="Profile Logo" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h2 className="text-4xl font-black tracking-tight">{user.name}</h2>
                {user.isAdmin && (
                  <div className="flex items-center gap-2 bg-[#c4a76d] text-[#1a2b4c] text-[10px] font-black px-4 py-1.5 rounded-full uppercase ring-4 ring-[#c4a76d]/20">
                    <i className="fa-solid fa-crown"></i>
                    ADMIN
                  </div>
                )}
              </div>
              <p className="text-white/60 font-medium mb-6">{user.email}</p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <button 
                  onClick={requestPermission}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${permission === 'granted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}
                >
                  <i className={`fa-solid ${permission === 'granted' ? 'fa-bell-slash' : 'fa-bell'}`}></i>
                  {permission === 'granted' ? (lang === 'ar' ? 'الإشعارات مفعلة' : 'Notifs Enabled') : (lang === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifs')}
                </button>

                {user.isAdmin && setView && (
                  <button 
                    onClick={() => setView('admin')}
                    className="bg-[#c4a76d] text-[#1a2b4c] px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-2xl shadow-[#c4a76d]/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <i className="fa-solid fa-gears"></i>
                    {lang === 'en' ? 'DASHBOARD' : 'لوحة التحكم'}
                  </button>
                )}
              </div>
            </div>
            <button 
              onClick={logout}
              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all px-8 py-4 rounded-2xl font-black text-xs border border-red-500/20 uppercase tracking-widest"
            >
              <i className="fa-solid fa-power-off mr-2"></i>
              {t('logout')}
            </button>
          </div>
        </div>

        {/* Orders History */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <div className="h-6 w-1 bg-[#1a2b4c] rounded-full"></div>
            <h3 className="font-black text-[#1a2b4c] dark:text-white uppercase tracking-widest text-sm">
              {lang === 'en' ? 'My Orders History' : 'سجل طلباتي'}
            </h3>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] p-20 rounded-[3rem] text-center border-2 border-dashed border-[#e0e0e0] dark:border-white/5">
              <i className="fa-solid fa-box-open text-4xl text-gray-100 dark:text-white/5 mb-4"></i>
              <p className="text-[#7a7a7a] font-black text-lg">{lang === 'en' ? 'Your history is clear' : 'لا توجد طلبات في سجلك'}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white dark:bg-[#1E293B] p-6 rounded-[2.5rem] border border-[#e0e0e0] dark:border-white/5 shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-[#0F172A] rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#1a2b4c]/10 group-hover:text-[#1a2b4c] transition-colors">
                        <i className="fa-solid fa-receipt text-xl"></i>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7a7a7a] font-black uppercase tracking-tighter">ID: {order.id.toUpperCase()}</span>
                        <h4 className="font-black text-[#1a2b4c] dark:text-white">{new Date(order.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</h4>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {t(`status_${order.status}`)}
                    </div>
                  </div>
                  <div className="pt-6 border-t border-[#e0e0e0] dark:border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-[#7a7a7a] uppercase tracking-widest">Collection Premium</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[#1a2b4c] dark:text-white">{order.total.toFixed(2)}</span>
                      <span className="text-[10px] font-black text-[#c4a76d]">SAR</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 animate-slide-up">
      <div className="bg-white dark:bg-[#1E293B] p-10 md:p-12 rounded-[3.5rem] shadow-2xl border border-[#e0e0e0] dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#1a2b4c]"></div>
        <div className="text-center mb-10">
           <div className="w-24 h-24 mx-auto mb-6 bg-gray-50 dark:bg-[#0F172A] p-4 rounded-[2rem] border border-[#e0e0e0] dark:border-white/5 shadow-inner overflow-hidden">
             <img src={APP_LOGO} className="w-full h-full object-contain" alt="Collection Logo" />
           </div>
           <h2 className="text-4xl font-black text-[#1a2b4c] dark:text-white tracking-tighter uppercase leading-none">
             {isLogin ? t('login') : t('signup')}
           </h2>
           <p className="text-[#7a7a7a] text-xs mt-3 font-bold tracking-widest uppercase">
             Collection Hub Access
           </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#7a7a7a] uppercase tracking-[0.2em] ml-2">Display Name</label>
              <input 
                type="text" required
                value={name} onChange={e => setName(e.target.value)}
                className="w-full px-8 py-5 rounded-2xl bg-gray-50 dark:bg-[#0F172A] border-2 border-transparent focus:border-[#c4a76d] focus:bg-white outline-none transition-all font-bold text-[#1a2b4c] dark:text-white shadow-sm placeholder-gray-300 dark:placeholder-gray-700" 
                placeholder="Name"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#7a7a7a] uppercase tracking-[0.2em] ml-2">Email Address</label>
            <input 
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-8 py-5 rounded-2xl bg-gray-50 dark:bg-[#0F172A] border-2 border-transparent focus:border-[#c4a76d] focus:bg-white outline-none transition-all font-bold text-[#1a2b4c] dark:text-white shadow-sm placeholder-gray-300 dark:placeholder-gray-700"
              placeholder="example@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#7a7a7a] uppercase tracking-[0.2em] ml-2">Password</label>
            <input 
              type="password" required
              value={pass} onChange={e => setPass(e.target.value)}
              className="w-full px-8 py-5 rounded-2xl bg-gray-50 dark:bg-[#0F172A] border-2 border-transparent focus:border-[#c4a76d] focus:bg-white outline-none transition-all font-bold text-[#1a2b4c] dark:text-white shadow-sm placeholder-gray-300 dark:placeholder-gray-700"
              placeholder="••••••••"
            />
          </div>
          
          <div className="space-y-4 pt-4">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1a2b4c] text-white py-6 rounded-2xl font-black text-xl shadow-2xl shadow-[#1a2b4c]/10 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
            >
              {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : (isLogin ? t('login') : t('signup'))}
            </button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-100 dark:border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-gray-100 dark:border-white/5"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white dark:bg-white/5 border-2 border-gray-100 dark:border-white/10 text-gray-700 dark:text-white py-5 rounded-2xl font-black text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              {t('googleLogin')}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5 space-y-4">
           <button 
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-xs font-black text-[#7a7a7a] uppercase tracking-widest hover:text-[#1a2b4c] transition-colors"
          >
            {isLogin ? "Need an account?" : "Already have an account?"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
