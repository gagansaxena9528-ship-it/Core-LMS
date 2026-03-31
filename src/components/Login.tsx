import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail } from '../services/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserCircle, Mail, Lock, UserPlus, Rocket, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';

const Login: React.FC = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (isRegistering && !name) {
      setError('Name is required for registration');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password, name);
        setSuccess('Registration successful! Please login.');
        setIsRegistering(false);
      } else {
        await loginWithEmail(email, password);
        window.location.reload();
      }
    } catch (err: any) {
      let message = err.message || 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loginLogo = settings?.branding?.loginLogo || settings?.branding?.headerLogo;
  const siteName = settings?.general?.siteName || 'CoreLMS';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-0 sm:p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1000px] min-h-[600px] bg-card border border-border rounded-none sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10"
      >
        {/* Left Side - Welcome Panel */}
        <div className="lg:w-[45%] bg-gradient-to-br from-secondary to-accent p-8 sm:p-12 lg:pr-20 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-2xl rounded-full -ml-24 -mb-24" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              {loginLogo ? (
                <img src={loginLogo} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Rocket className="text-white" size={20} />
                </div>
              )}
              <span className="text-lg font-bold text-white tracking-tight font-syne">{siteName}</span>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white font-syne leading-[1.1] tracking-tight max-w-[320px]">
                Welcome <br /> to <span className="text-white/80">{siteName}</span>
              </h2>
              <p className="text-white/70 text-sm xl:text-base leading-relaxed max-w-[260px]">
                Empowering education through technology. Access your courses, track progress, and achieve your goals.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 lg:mt-0">
            <div className="flex items-center gap-4 text-white/40 text-[9px] uppercase tracking-[0.25em] font-bold">
              <span>CoreLMS</span>
              <div className="w-px h-3 bg-white/10" />
              <span>Platform</span>
            </div>
          </div>

          {/* Wavy Separator (Desktop Only) - Improved Curve */}
          <svg 
            className="absolute right-[-1px] top-0 h-full w-24 fill-card hidden lg:block" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
          >
            <path d="M0 0 Q 80 0, 80 50 T 0 100 L 100 100 L 100 0 Z" />
          </svg>
        </div>

        {/* Right Side - Form Panel */}
        <div className="flex-1 p-8 sm:p-12 xl:p-20 flex flex-col justify-center bg-card">
          <div className="max-w-[380px] mx-auto w-full">
            <div className="mb-12">
              <h3 className="text-3xl xl:text-4xl font-extrabold text-white mb-3 font-syne tracking-tight">
                {isRegistering ? 'Create account' : 'Sign in'}
              </h3>
              <p className="text-muted text-sm xl:text-base">
                {isRegistering ? 'Enter your details to get started' : 'Enter your credentials to access your dashboard'}
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-medium mb-6 flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl text-xs font-medium mb-6 flex items-center gap-3"
              >
                <CheckCircle2 size={16} />
                {success}
              </motion.div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <AnimatePresence mode="wait">
                {isRegistering && (
                  <motion.div 
                    key="name-field"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    <label className="text-[11px] font-bold text-muted uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative group">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-secondary transition-colors" size={20} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-secondary transition-all focus:ring-4 focus:ring-secondary/10"
                        placeholder="Enter your name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider ml-1">E-mail Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-secondary transition-colors" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-secondary transition-all focus:ring-4 focus:ring-secondary/10"
                    placeholder="Enter your mail"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Password</label>
                  {!isRegistering && (
                    <button type="button" className="text-[10px] font-bold text-secondary hover:underline uppercase tracking-wider">Forgot?</button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-secondary transition-colors" size={20} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-secondary transition-all focus:ring-4 focus:ring-secondary/10"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-secondary hover:bg-secondary/90 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {isRegistering ? 'Sign Up' : 'Sign In'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="flex-1 py-4 bg-transparent border border-border text-white rounded-2xl font-bold text-sm hover:bg-card transition-all active:scale-[0.98]"
                >
                  {isRegistering ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </form>

            <div className="mt-12 p-5 bg-card/50 border border-border rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <LogIn size={16} className="text-secondary" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">System Access</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Admin can create student and teacher accounts from the dashboard. Use your assigned credentials to login.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
