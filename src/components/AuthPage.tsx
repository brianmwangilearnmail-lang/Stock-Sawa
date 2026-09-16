import React, { useState } from 'react';
import { Store, Key, Mail, Lock, ShieldCheck, Loader2, User, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { resetDatabase } from '../db/indexedDb';

interface AuthPageProps {
  onSuccess: () => void;
  onBack?: () => void;
}

export default function AuthPage({ onSuccess, onBack }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    setDiagnosticResult(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password 
        });
        if (error) throw error;
        if (data.session) {
          // Wipe local data before loading the authenticated user's data
          await resetDatabase();
          onSuccess();
        }
      } else {
        // Signup
        const { data, error } = await supabase.auth.signUp({ 
          email: cleanEmail, 
          password,
          options: {
            data: { username: username.trim() }
          }
        });
        
        if (error) {
          const lowerMsg = (error.message || '').toLowerCase();
          if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists') || (error as any)?.code === 'user_already_exists') {
            setError('This email is already registered! Please enter your password to log in.');
            setIsLogin(true);
            return;
          }
          throw error;
        }

        // If email is already registered, Supabase may return user with empty identities
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError('This email is already registered! Please enter your password to log in.');
          setIsLogin(true);
          return;
        }

        // If session is returned immediately, email confirmation is disabled — go straight in
        if (data.session) {
          await resetDatabase();
          onSuccess();
        } else {
          // Email confirmation required
          setSuccessMsg('Account created! Please check your email inbox to confirm your account, then log in.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      const msg = err?.message || String(err);
      const lower = msg.toLowerCase();

      if (lower.includes('already registered') || lower.includes('already exists') || err?.code === 'user_already_exists') {
        setError('This email is already registered! Please log in with your password.');
        setIsLogin(true);
      } else if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
        setError('Incorrect email or password. Please check your credentials or reset your password.');
      } else if (lower.includes('email not confirmed')) {
        setError('Please confirm your email first. A confirmation link was sent to your inbox.');
      } else if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network error')) {
        setError('Network error: Unable to connect to Supabase backend. Please check your connection or ad blocker.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address first, then click Forgot Password.');
      return;
    }

    setIsResetting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setSuccessMsg(`Password reset link sent to ${cleanEmail}. Please check your inbox!`);
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  const runConnectivityCheck = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET' });
      if (res.ok || res.status === 200 || res.status === 401) {
        setDiagnosticResult('✅ Supabase server is reachable from your browser! You can now log in.');
      } else {
        setDiagnosticResult(`⚠️ Server responded with HTTP status ${res.status}.`);
      }
    } catch (e: any) {
      setDiagnosticResult(`❌ Browser cannot reach ${supabaseUrl}. Check if Brave Shields, uBlock Origin, or a VPN is blocking Supabase requests.`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500/20 relative">
      
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-4 sm:left-8 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Home
        </button>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">StockSawa</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Shop Owner Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-semibold border border-rose-200 dark:border-rose-800/50 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            
            {(error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) && (
              <div className="mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-800/40">
                <button
                  type="button"
                  onClick={runConnectivityCheck}
                  disabled={isDiagnosing}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 underline hover:no-underline"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  Test Browser Connection to Supabase
                </button>
              </div>
            )}
          </div>
        )}

        {diagnosticResult && (
          <div className="mb-6 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {diagnosticResult}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2 animate-[scaleIn_0.2s_ease-out]">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1.5 animate-[fadeIn_0.2s_ease-out]">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Shop Name / Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required={!isLogin}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none placeholder-slate-400"
                  placeholder="My Supermarket"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none placeholder-slate-400"
                placeholder="shop@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Password
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  {isResetting ? 'Sending...' : 'Forgot password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none placeholder-slate-400"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Key className="h-5 w-5" />}
            <span>{isLogin ? 'Secure Login' : 'Create Account'}</span>
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMsg(null);
              setDiagnosticResult(null);
            }}
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
