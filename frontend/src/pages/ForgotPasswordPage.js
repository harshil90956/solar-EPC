import React, { useState } from 'react';
import {
  Sun, ArrowLeft, Mail, ArrowRight, CheckCircle, Loader2, Lock
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { toast } from '../components/ui/Toast';
import { APP_CONFIG } from '../config/app.config';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1 = email, 2 = otp, 3 = password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.forgotPassword(email);
      if (response.success) {
        setStep(2);
        toast.success('OTP sent to your email');
        console.log('OTP for testing:', response.otp);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.verifyOtp(email, otp);
      if (response.success) {
        setResetToken(response.resetToken);
        setStep(3);
        toast.success('OTP verified');
      }
    } catch (error) {
      toast.error(error?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.resetPassword(resetToken, newPassword);
      if (response.success) {
        toast.success('Password reset successfully');
        setTimeout(() => {
          window.location.hash = '';
        }, 2000);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 1) {
      window.location.hash = '';
    } else {
      setStep(step - 1);
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
            {step === 3 ? 'New' : 'Reset'}<br />
            <span className="gradient-solar">Password</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-8">
            {step === 1 && 'Enter your email address and we\'ll send you a 6-digit OTP to reset your password.'}
            {step === 2 && 'Enter the 6-digit OTP sent to your email to continue.'}
            {step === 3 && 'Enter your new password to complete the reset process.'}
          </p>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center py-10 px-4 relative">
          <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(var(--border-base) 1px,transparent 1px),linear-gradient(90deg,var(--border-base) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative w-full max-w-md animate-fade-in">
            {/* Back Link */}
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Back to {step === 1 ? 'Sign In' : 'Previous Step'}
            </button>

            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 text-center">
                {step === 1 && 'Forgot Password'}
                {step === 2 && 'Enter OTP'}
                {step === 3 && 'Set New Password'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mb-6 text-center">
                {step === 1 && 'Enter your email to receive OTP'}
                {step === 2 && `OTP sent to ${email}`}
                {step === 3 && 'Create a strong new password'}
              </p>

              {/* Step 1: Email Input */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                      boxShadow: '0 4px 16px var(--primary-glow)',
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Send OTP
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: OTP Input */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      6-digit OTP
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                        autoFocus
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-center tracking-[8px] font-mono text-lg"
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1 text-center">
                      Check your email for the OTP code
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                      boxShadow: '0 4px 16px var(--primary-glow)',
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Verify OTP
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        minLength={6}
                        required
                        autoFocus
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        minLength={6}
                        required
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                      boxShadow: '0 4px 16px var(--primary-glow)',
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
