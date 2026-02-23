'use client';

import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import {
  FiArrowRight,
  FiUsers,
  FiTrendingUp,
  FiShield,
  FiCheckCircle,
  FiMail,
  FiUser,
  FiStar,
  FiCreditCard,
  FiLock,
  FiFacebook
} from 'react-icons/fi';
import { FaInstagram, FaXTwitter, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa6';

type Interest = 'lender' | 'borrower';

const LOGO_URL = 'https://www.feyza.app/feyza.png';

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/', icon: FaInstagram },
  { label: 'Facebook', href: 'https://x.com/', icon: FiFacebook },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: FaLinkedinIn },
] as const;

// The four trust tiers vouch-based, shown as a teaser
const TIERS = [
  { tier: '01', label: 'New', vouches: '0 vouches', hint: 'Starting point' },
  { tier: '02', label: 'Rising', vouches: '3 vouches', hint: 'First unlock' },
  { tier: '03', label: 'Trusted', vouches: '6 vouches', hint: 'Community backed' },
  { tier: '04', label: 'Verified', vouches: '11 vouches', hint: 'Highest access' },
];

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [interest, setInterest] = useState<Interest>('borrower');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const content = useMemo(() => {
    if (interest === 'borrower') {
      return {
        headline: 'Build trust. Get funded.',
        sub: 'No credit check. Your community vouches for you lenders listen.',
        bullets: [
          { icon: FiUsers, text: 'Community vouches open doors' },
          { icon: FiTrendingUp, text: 'Four tiers, bigger loans with each' },
          { icon: FiCreditCard, text: 'Transparent repayment tracking' },
        ],
        cta: 'Join the Borrower Waitlist',
        accent: 'green',
      };
    }
    return {
      headline: 'Lend with clarity. Backed by trust.',
      sub: 'See who vouches for each borrower. Know who you\'re lending to.',
      bullets: [
        { icon: FiShield, text: 'Vouch-verified borrowers only' },
        { icon: FiStar, text: 'Live trust score breakdown' },
        { icon: FiCheckCircle, text: 'Structured repayment schedules' },
      ],
      cta: 'Join the Lender Waitlist',
      accent: 'green',
    };
  }, [interest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name, interest_type: interest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Something went wrong');
      setSuccess(true);
      setEmail('');
      setName('');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex flex-col">

      {/* ─── Atmosphere ─── */}
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
        }}
      />
      {/* Radial green glow top center */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-10"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #f59e0b 0%, transparent 70%)' }}
        />
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10 flex items-center justify-center pt-10 pb-0">
        <img src={LOGO_URL} alt="Feyza" width={48} height={48} className="h-12 w-auto object-contain opacity-90" />
      </header>

      {/* ─── Main ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">

        {/* MARQUEE HEADLINE */}
        <div className="w-full max-w-5xl mx-auto text-center mb-3">
          <p className="text-[11px] sm:text-xs tracking-[0.4em] text-green-400/70 font-semibold uppercase mb-4">
            Launching Soon
          </p>
          <h1
            className="font-display font-black text-white leading-none tracking-tight"
            style={{ fontSize: 'clamp(3.5rem, 14vw, 9rem)', letterSpacing: '-0.02em' }}
          >
            FEYZA
          </h1>
          <div
            className="text-neutral-500 font-display font-bold tracking-[0.25em] uppercase"
            style={{ fontSize: 'clamp(0.65rem, 2vw, 1rem)' }}
          >
            Trust-Based Lending Platform
          </div>
        </div>

        {/* green rule */}
        <div className="w-16 h-px bg-green-400/40 my-8" />

        {/* Tagline */}
        <p className="text-center text-neutral-300 text-base sm:text-lg max-w-md mx-auto mb-12 leading-relaxed">
          We don't look at your credit score.
          <br />
          <span className="text-green-300">We look at who vouches for you.</span>
        </p>

        {/* Tier preview strip */}
        <div className="w-full max-w-2xl mx-auto mb-12">
          <div className="grid grid-cols-4 gap-2">
            {TIERS.map((t, i) => (
              <div
                key={t.tier}
                className={`rounded-xl border p-3 text-center transition-all ${
                  i === 0
                    ? 'border-green-500/40 bg-green-500/8'
                    : 'border-neutral-800 bg-neutral-900/50 opacity-50'
                }`}
              >
                <p className="text-[10px] text-neutral-500 font-bold tracking-[0.2em] uppercase mb-1">Tier {t.tier}</p>
                <p className={`text-sm font-bold ${i === 0 ? 'text-green-300' : 'text-neutral-400'}`}>{t.label}</p>
                <p className="text-[10px] text-neutral-600 mt-1">{t.vouches}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-neutral-600 mt-3 tracking-wide">
            Higher tier = higher loan limits. Earned through community vouches.
          </p>
        </div>

        {/* Toggle + Form Grid */}
        <div className="w-full max-w-4xl mx-auto grid lg:grid-cols-2 gap-8 items-start">

          {/* Left: Dynamic content */}
          <div className="text-white">
            {/* Toggle */}
            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-1.5 mb-8">
              <div className="grid grid-cols-2 gap-1.5">
                {(['borrower', 'lender'] as Interest[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInterest(type)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all capitalize ${
                      interest === type
                        ? type === 'borrower'
                          ? 'bg-green-400 text-neutral-950'
                          : 'bg-green-400 text-neutral-950'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {type === 'borrower' ? '🎯 Borrower' : '💰 Lender'}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4 leading-tight">
              {content.headline}
            </h2>
            <p className="text-neutral-400 mb-8 leading-relaxed">{content.sub}</p>

            <div className="space-y-4">
              {content.bullets.map((b) => (
                <div key={b.text} className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    content.accent === 'green'
                      ? 'bg-green-400/10 border border-green-400/20'
                      : 'bg-green-400/10 border border-green-400/20'
                  }`}>
                    <b.icon className={`w-4 h-4 ${content.accent === 'green' ? 'text-green-400' : 'text-green-400'}`} />
                  </div>
                  <span className="text-neutral-300 text-sm">{b.text}</span>
                </div>
              ))}
            </div>

            {/* Trust signals */}
            <div className="mt-10 pt-8 border-t border-neutral-800 flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <FiLock className="w-3.5 h-3.5" /> No spam
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <FiShield className="w-3.5 h-3.5" /> Early access only
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <FiCheckCircle className="w-3.5 h-3.5" /> Free forever
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div>
            {success ? (
              <div
                className={`rounded-2xl border bg-neutral-900 p-10 text-center transition-all ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ borderColor: content.accent === 'green' ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)' }}
              >
                <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center ${
                  content.accent === 'green' ? 'bg-green-400/10' : 'bg-green-400/10'
                }`}>
                  <FiCheckCircle className={`w-8 h-8 ${content.accent === 'green' ? 'text-green-400' : 'text-green-400'}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">You're on the list</h3>
                <p className="text-neutral-500 text-sm">We'll reach out the moment access opens.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl shadow-black/50">
                <h3 className="text-lg font-bold text-white mb-1">Join the waitlist</h3>
                <p className="text-neutral-500 text-sm mb-6">Early access. No spam. Cancel anytime.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name (optional)"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-800 text-white placeholder-neutral-600 text-sm outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address *"
                      required
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-800 text-white placeholder-neutral-600 text-sm outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      content.accent === 'green'
                        ? 'bg-green-400 hover:bg-green-300 text-neutral-950 disabled:bg-green-400/50'
                        : 'bg-green-400 hover:bg-green-300 text-neutral-950 disabled:bg-green-400/50'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Joining...
                      </span>
                    ) : (
                      <>
                        {content.cta}
                        <FiArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-neutral-700 text-xs tracking-wide">
            © {new Date().getFullYear()} Feyza All rights reserved
          </p>
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="w-9 h-9 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all flex items-center justify-center text-neutral-600 hover:text-neutral-300"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
