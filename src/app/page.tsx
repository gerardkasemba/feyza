'use client';

import { useMemo, useState } from 'react';
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
} from 'react-icons/fi';
import { FaInstagram, FaXTwitter, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa6';

type Interest = 'lender' | 'borrower';

const LOGO_URL = 'https://www.feyza.app/feyza.png';

// TODO: replace these with your real social URLs
const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/', icon: FaInstagram },
  { label: 'X', href: 'https://x.com/', icon: FaXTwitter },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: FaLinkedinIn },
  { label: 'TikTok', href: 'https://tiktok.com/', icon: FaTiktok },
  { label: 'YouTube', href: 'https://youtube.com/', icon: FaYoutube },
] as const;

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [interest, setInterest] = useState<Interest>('borrower');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const content = useMemo(() => {
    if (interest === 'borrower') {
      return {
        headline: (
          <>
            Build <span className="text-primary-200">Trust</span>.
            <br />
            Get Funded.
          </>
        ),
        sub: 'No credit check. Start small. Prove yourself. Unlock bigger loans.',
        bullets: [
          { icon: FiUsers, text: 'Community vouches' },
          { icon: FiTrendingUp, text: 'Grow your Trust Score' },
          { icon: FiCreditCard, text: 'Simple repayment tracking' },
        ],
        cta: 'Join Borrower Waitlist',
      };
    }

    return {
      headline: (
        <>
          Lend with <span className="text-primary-200">Clarity</span>.
          <br />
          Powered by Trust.
        </>
      ),
      sub: 'See trust signals, verification, and real repayment behavior.',
      bullets: [
        { icon: FiShield, text: 'Verification signals' },
        { icon: FiStar, text: 'Trust Score breakdown' },
        { icon: FiCheckCircle, text: 'Structured repayment tracking' },
      ],
      cta: 'Join Lender Waitlist',
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
        body: JSON.stringify({
          email,
          full_name: name,
          interest_type: interest,
        }),
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
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 dark:from-primary-800 dark:via-primary-900 dark:to-neutral-950 relative overflow-hidden">
      {/* Soft radial background like homepage */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
      </div>

      {/* Layout: content + footer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Main content */}
        <main className="flex-1 flex items-center justify-center">
          <div className="max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-16">
            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
              <div className="flex items-center justify-center mb-4">
                {/* Using <img> prevents blank screen if next/image remote domains aren't configured */}
                <img
                  src={LOGO_URL}
                  alt="Feyza"
                  width={100}
                  height={100}
                  className="h-[100px] w-[100px] object-contain"
                />
              </div>

              {/* VERY VISIBLE COMING SOON */}
              <div className="text-center">
                <h1 className="text-6xl sm:text-8xl font-display font-black text-white tracking-tight">
                  COMING SOON
                </h1>
                <p className="text-white/80 text-lg mt-4">The Trust-Based Lending Platform</p>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left: Messaging */}
              <div className="text-white">
                {/* Toggle */}
                <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2 mb-8">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInterest('borrower')}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        interest === 'borrower'
                          ? 'bg-white text-primary-700'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      🎯 Borrower
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterest('lender')}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        interest === 'lender'
                          ? 'bg-white text-primary-700'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      💰 Lender
                    </button>
                  </div>
                </div>

                {/* Headline */}
                <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6 leading-tight">
                  {content.headline}
                </h2>

                <p className="text-lg text-white/90 mb-8 max-w-xl">{content.sub}</p>

                {/* Bullets */}
                <div className="space-y-4">
                  {content.bullets.map((b) => (
                    <div key={b.text} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <b.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white/90">{b.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Form Card */}
              <div>
                {success ? (
                  <div className="rounded-2xl border border-white/20 bg-white dark:bg-neutral-900 shadow-2xl p-8 text-center">
                    <FiCheckCircle className="w-10 h-10 text-primary-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                      You're on the list!
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      We’ll notify you as soon as access opens.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/20 bg-white dark:bg-neutral-900 shadow-2xl p-8">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                      Join the Waitlist
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name */}
                      <div className="relative">
                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full Name (optional)"
                          className="w-full pl-12 pr-4 py-4 rounded-xl border border-neutral-200 dark:border-neutral-700
                                     bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-50
                                     outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/60"
                        />
                      </div>

                      {/* Email */}
                      <div className="relative">
                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email Address *"
                          required
                          className="w-full pl-12 pr-4 py-4 rounded-xl border border-neutral-200 dark:border-neutral-700
                                     bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-50
                                     outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/60"
                        />
                      </div>

                      {error && <div className="text-sm text-red-200/90">{error}</div>}

                      <Button type="submit" size="lg" disabled={loading} className="w-full">
                        {loading ? 'Joining...' : content.cta}
                        <FiArrowRight className="w-5 h-5 ml-2" />
                      </Button>

                      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                        Early access. No spam.
                      </p>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Footer with social icons (opens blank page / new tab) */}
        <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/70 text-sm">© {new Date().getFullYear()} Feyza. All rights reserved.</p>

            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition flex items-center justify-center text-white/80 hover:text-white"
                >
                  <s.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
