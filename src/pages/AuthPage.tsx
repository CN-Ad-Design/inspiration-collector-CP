import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, Loader2, Zap } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Calculate expiration time
    // Default session: 2 hours. Remember me: 15 days
    const expiresInMs = rememberMe ? 15 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const expiresAt = Date.now() + expiresInMs;

    // Get env vars, checking both VITE_ prefixed (Vite/Client) and raw env (sometimes Vercel handles them differently)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Mock auth behavior if Supabase env vars are not set properly
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co' || supabaseUrl.includes('your-project-id')) {
      setTimeout(() => {
        useAuthStore.getState().setUser({ id: 'mock-user-1', email }, expiresAt);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('注册成功，请查收验证邮件或直接登录！');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || '认证失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-[#0A0A0E] overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#7828c8]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#9c39ff]/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10 p-8 bg-[#1D1E24]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#9c39ff] to-[#4f46e5] rounded-xl flex items-center justify-center shadow-lg shadow-[#9c39ff]/20 overflow-hidden relative">
            <img 
              src="https://m.syqhy.cn/w/67aca9e663da59ec2176461a/24d9c490a6e7498c83a5cd5f308a0d44.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain z-10" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }} 
            />
            <Zap className="w-6 h-6 text-white fill-white absolute hidden z-0" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-8">
          {isLogin ? '登录灵感收集器' : '注册账号'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#9c39ff] transition-colors"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#9c39ff] transition-colors"
                placeholder="••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-white/30 rounded bg-black/40 peer-checked:bg-[#9c39ff] peer-checked:border-[#9c39ff] transition-colors flex items-center justify-center">
                  <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors select-none">
                15天内免登录
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#9c39ff] to-[#4f46e5] hover:opacity-90 text-white rounded-xl font-medium transition-all flex items-center justify-center mt-6 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            {isLogin ? '没有账号？点击注册' : '已有账号？返回登录'}
          </button>
        </div>
      </div>
    </div>
  );
}