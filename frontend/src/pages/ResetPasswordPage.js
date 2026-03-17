import React, { useState, useEffect } from 'react';
import {
  Sun, ArrowLeft, Lock, Eye, EyeOff, CheckCircle, Loader2
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { toast } from '../components/ui/Toast';
import { APP_CONFIG } from '../config/app.config';

const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL hash or query params
    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    if (match) {
      setToken(match[1]);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col xl:flex-row">
      {/* ══ LEFT BRAND PANEL ══ */}
      <div
        className="hidden xl:flex flex-col justify-between w-[380px] shrink-0 p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(37,99,235,0.10) 0%, rgba(7,8,15,1) 60%)',
          borderRight: '1px solid var(--border-base)',
        }}
      >
        <div className="absolute -top-28 -left-28 w-80 h-80 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, transparent 70%)' }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl"
              style={{
                background: `linear-gradient(to bottom right, var(--primary), var(--primary-light))`,
              }}
            >
              <Sun size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-extrabold text-lg text-[var(--text-primary)] tracking-tight">{APP_CONFIG.name}</p>
              <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest">{APP_CONFIG.edition}</p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] leading-snug mb-4">
            Set New<br />
            <span className="gradient-solar">Password</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-8">
            Create a strong password to secure your account. Make sure it's at least 6 characters.
          </p>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center py-10 px-4 relative">
          <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(var(--border-base) 1px,transparent 1px),linear-gradient(90deg,var(--border-base) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative w-full max-w-md animate-fade-in">
            <a
              href="#"
              className="inline-flex items-center gap-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </a>

            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">Reset Password</h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-6 text-center">
                {success
                  ? 'Your password has been reset successfully'
                  : 'Enter your new password below'}
              </p>

              {success ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Your password has been reset.<br />
                    You can now sign in with your new password.
                  </p>
                  <a
                    href="#"
                    className="inline-block px-4 py-2 text-xs font-medium text-white rounded-lg"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
                  >
                    Go to Sign In
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoFocus
                        className="w-full pl-10 pr-10 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-10 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                      boxShadow: '0 4px 16px var(--primary-glow)',
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  {!token && (
                    <p className="text-xs text-red-400 text-center">
                      Invalid or missing reset token. Please request a new password reset.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
