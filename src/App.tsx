import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import ImagesPage from './pages/ImagesPage';
import TextPage from './pages/TextPage';
import PingPage from './pages/PingPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { Search } from 'lucide-react';

function App() {
  const setTheme = useThemeStore((state) => state.setTheme);
  const { user, setUser, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    setTheme('dark'); // Force dark theme as default
  }, [setTheme]);

  useEffect(() => {
    // If no Supabase URL is provided, mock the session check to immediately resolve to null (requires login)
    if (!import.meta.env.VITE_SUPABASE_URL) {
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0E]">
        <div className="w-8 h-8 border-4 border-[#9c39ff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col h-screen bg-[#0A0A0E] text-slate-100 overflow-hidden relative font-sans">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          {/* Subtle noise texture via CSS */}
          <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          
          {/* Ambient glowing orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#7828c8]/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#9c39ff]/10 blur-[100px]" />
          <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-[#226b98]/10 blur-[120px]" />
        </div>

        <Header />
        <main className="flex-1 overflow-y-auto relative z-10">
          <Routes>
            <Route path="/" element={<Navigate to="/images" replace />} />
            <Route path="/auth" element={user ? <Navigate to="/images" replace /> : <AuthPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/text" element={<TextPage />} />
            <Route path="/ping" element={<PingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
