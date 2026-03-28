import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail } from '../services/auth';
import { motion } from 'framer-motion';
import { LogIn, UserCircle, Mail, Lock, UserPlus, RefreshCw } from 'lucide-react';

const Login: React.FC = () => {
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
        // Auth state will be updated by subscribeToAuth in App.tsx
        window.location.reload(); // Refresh to trigger auth state update
      }
    } catch (err: any) {
      let message = err.message || 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e17] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] bg-[#131726]/80 backdrop-blur-xl border border-[#242b40] rounded-[24px] p-6 sm:p-10 shadow-2xl relative z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f8ef7] to-[#7c5fe6] flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
            C
          </div>
          <h1 className="text-2xl font-bold text-white font-syne tracking-tight">
            Core<span className="text-[#4f8ef7]">LMS</span>
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-white mb-1 font-syne">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-[#6b7599]">
            {isRegistering ? 'Join our learning community today' : 'Apne account se login karein'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-1"
            >
              <label className="text-xs font-semibold text-[#6b7599] uppercase tracking-wider">Name</label>
              <div className="relative group">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599] group-focus-within:text-[#4f8ef7] transition-colors" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#4f8ef7] transition-all focus:ring-1 focus:ring-[#4f8ef7]/30"
                  placeholder="Your Name"
                />
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-1"
          >
            <label className="text-xs font-semibold text-[#6b7599] uppercase tracking-wider">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599] group-focus-within:text-[#4f8ef7] transition-colors" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#4f8ef7] transition-all focus:ring-1 focus:ring-[#4f8ef7]/30"
                placeholder="admin@example.com"
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#6b7599] uppercase tracking-wider">Password</label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599] group-focus-within:text-[#4f8ef7] transition-colors" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a2035] border border-[#242b40] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#4f8ef7] transition-all focus:ring-1 focus:ring-[#4f8ef7]/30"
                placeholder="••••••••"
              />
            </div>
          </motion.div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#4f8ef7] to-[#7c5fe6] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
                {isRegistering ? 'Create Account' : 'Login Now'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setSuccess(null);
            }}
            className="text-sm text-[#4f8ef7] hover:underline block w-full"
          >
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>

        <div className="mt-8 p-4 bg-[#1a2035] rounded-xl text-xs">
          <h3 className="font-semibold text-[#6b7599] uppercase tracking-wider mb-3">System Access</h3>
          <p className="text-[#6b7599] leading-relaxed">
            Admin can create student and teacher accounts from the dashboard.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
