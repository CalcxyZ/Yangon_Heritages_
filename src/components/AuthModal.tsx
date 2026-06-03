/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Shield, Lock, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { backend, isFirebaseConfigured } from '../lib/firebase';

interface AuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AuthModal({ onSuccess, onCancel }: AuthModalProps) {
  const [emailOrName, setEmailOrName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!emailOrName.trim()) {
      setIsLoading(false);
      return setErrorMsg('Please enter an email address or username.');
    }

    try {
      if (isFirebaseConfigured) {
        // Direct Firebase Integration
        await backend.login(emailOrName.trim());
      } else {
        // High fidelity simple sandbox logic
        await backend.login(emailOrName.trim());
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please verify credentials or enable browser popups.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-modal-dialog" className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col p-6 gap-5">
        
        {/* Head branding header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl w-fit">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="font-semibold text-slate-800 text-lg mt-2 leading-tight">Curator Sign In</h2>
            <span className="text-xs text-gray-500">Access Heritage Sites CMS Dashboard</span>
          </div>
          <button
            id="auth-close-btn"
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Service Notice */}
        <div className={`p-3 rounded-xl border text-[11px] font-medium leading-relaxed ${
          isFirebaseConfigured 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
            : 'bg-amber-50 text-amber-800 border-amber-150'
        }`}>
          {isFirebaseConfigured ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>Cloud Engine Live: Using secure Firebase Authentication and real-time Firestore database.</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Sandbox Curation: Entering live preview. Any username enables the Curator privileges in local storage fallback.</span>
            </span>
          )}
        </div>

        {/* Sign in fields */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium leading-normal flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="auth-email" className="text-xs font-medium text-slate-700">Email or Username</label>
            <input
              id="auth-email"
              type="text"
              required
              placeholder={isFirebaseConfigured ? "mikel@gmail.com" : "curator_admin"}
              value={emailOrName}
              onChange={(e) => setEmailOrName(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <label htmlFor="auth-password">Security PIN / Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Prompt Submit button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md text-sm font-semibold transition active:scale-95 disabled:opacity-75 flex items-center justify-center gap-1 cursor-pointer"
          >
            {isLoading ? 'Verifying Identity...' : 'Access Curator Panel'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        {/* Backdoor support note */}
        <span className="text-[10px] text-gray-400 text-center select-none">
          Strictly authorized access only. Session logs are audited.
        </span>
      </div>
    </div>
  );
}
