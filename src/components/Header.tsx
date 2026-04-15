import { NavLink } from 'react-router-dom';
import { Sparkles, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

export default function Header() {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co' || supabaseUrl.includes('your-project-id')) {
      useAuthStore.getState().setUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <header className="h-14 bg-[#ffffff]/[0.06] shadow-sm flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center space-x-2 w-1/3">
        <img src="https://m.syqhy.cn/w/67aca9e663da59ec2176461a/24d9c490a6e7498c83a5cd5f308a0d44.png" alt="灵感收集器" className="w-6 h-6 object-contain" onError={(e) => {
          // Fallback to old icon if image is missing
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }} />
        <Sparkles className="w-4 h-4 text-purple-400 hidden" />
        <span className="font-bold text-sm tracking-wide text-white">灵感收集器</span>
      </div>

      <nav className="flex justify-center space-x-8 w-1/3">
        <NavLink
          to="/images"
          className={({ isActive }) =>
            clsx(
              'text-sm transition-colors font-medium',
              isActive ? 'text-[#9c39ff]' : 'text-slate-300 hover:text-white'
            )
          }
        >
          图片灵感
        </NavLink>
        <NavLink
          to="/text"
          className={({ isActive }) =>
            clsx(
              'text-sm transition-colors font-medium',
              isActive ? 'text-[#9c39ff]' : 'text-slate-300 hover:text-white'
            )
          }
        >
          文字灵感
        </NavLink>
        <NavLink
          to="/ping"
          className={({ isActive }) =>
            clsx(
              'text-sm transition-colors font-medium relative group',
              isActive ? 'text-[#9c39ff]' : 'text-slate-300 hover:text-white'
            )
          }
        >
          砰~
        </NavLink>
      </nav>

      <div className="w-1/3 flex justify-end items-center gap-4">
        {user ? (
          <>
            <span className="text-xs text-white/50">{user.email}</span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-transparent border border-white/20 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/80 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
          </>
        ) : (
          <NavLink 
            to="/auth"
            className="bg-gradient-to-r from-[#9c39ff] to-[#4f46e5] hover:opacity-90 text-white text-xs font-medium px-5 py-1.5 rounded-full transition-all shadow-[0_0_15px_rgba(156,57,255,0.3)] hover:shadow-[0_0_20px_rgba(156,57,255,0.5)]"
          >
            登录 / 注册
          </NavLink>
        )}
      </div>
    </header>
  );
}
