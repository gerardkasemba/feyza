'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { BusinessProfile } from '@/types';
import { 
  Building2, MapPin, Globe, Calendar, DollarSign, 
  Percent, Shield, CheckCircle, ArrowRight, Star, Clock,
  ExternalLink, Mail, Phone, TrendingUp, Target,
  CreditCard, Hand, FileText, Sparkles,
  Heart
} from 'lucide-react';
import { FaShieldAlt, FaStar, FaRocket, FaHandshake } from 'react-icons/fa';
import { GiTakeMyMoney } from 'react-icons/gi';
import { IoMedicalOutline, IoBusinessOutline } from 'react-icons/io5';
import { BsLightningCharge } from 'react-icons/bs';

export default function PublicLenderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [lender, setLender] = useState<BusinessProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchLender = async () => {
      const supabase = createClient();
      
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setUser(profile);
        }
        
        const { data: business, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('slug', slug)
          .eq('public_profile_enabled', true)
          .eq('verification_status', 'approved')
          .single();
        
        if (error || !business) {
          console.error('Lender not found:', error);
          setNotFound(true);
          setLoading(false);
          return;
        }
        
        setLender(business);
      } catch (error) {
        console.error('Error fetching lender:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchLender();
  }, [slug]);

  const handleRequestLoan = () => {
    if (lender) {
      sessionStorage.setItem('preferred_lender_slug', slug);
      router.push('/loans/new?lender=' + slug);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950">
        <Navbar user={user} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 border-3 border-green-600 dark:border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">Loading lender profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !lender) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950">
        <Navbar user={user} />
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md text-center p-6 sm:p-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-2">Lender Not Found</h1>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mb-6">
              This lender profile is either private or has been removed.
            </p>
            <Link href="/loans/new">
              <Button className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white w-full sm:w-auto">
                Browse All Lenders
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const getBusinessTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      microfinance: 'Microfinance',
      credit_union: 'Credit Union',
      community_lender: 'Community Lender',
      fintech: 'FinTech',
      peer_lending: 'P2P Platform',
      payday_lender: 'Licensed Lender',
      investment_club: 'Investment Club',
      other: 'Lender',
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Navbar user={user} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-green-600 dark:bg-green-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Mobile: Centered stack layout */}
            <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:text-left gap-6 lg:gap-8">
              {/* Logo & Badges */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-white/10 dark:bg-white/20 rounded-xl sm:rounded-2xl border-2 border-white/20 flex items-center justify-center mb-3 sm:mb-4">
                  {lender.logo_url ? (
                    <img 
                      src={lender.logo_url} 
                      alt={lender.business_name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl bg-white/10 dark:bg-white/20 flex items-center justify-center">
                      <Building2 className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-white/80" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap justify-center lg:justify-start gap-1.5 sm:gap-2">
                  <Badge className="bg-white/20 dark:bg-white/30 text-white border-white/30 dark:border-white/40 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                  <Badge className="bg-white/20 dark:bg-white/30 text-white border-white/30 dark:border-white/40 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                    <Shield className="w-3 h-3 mr-1" />
                    Licensed
                  </Badge>
                  {lender.years_in_business && (
                    <Badge className="bg-white/20 dark:bg-white/30 text-white border-white/30 dark:border-white/40 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {lender.years_in_business}+ yrs
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Business Info */}
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 break-words">
                  {lender.business_name}
                </h1>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-4 text-white/80 dark:text-white/90 text-sm sm:text-base mb-3 sm:mb-4">
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <Building2 className="w-4 h-4" />
                    {getBusinessTypeLabel(lender.business_type)}
                  </span>
                  {lender.state && (
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <MapPin className="w-4 h-4" />
                      {lender.state}, USA
                    </span>
                  )}
                </div>
                
                {lender.tagline && (
                  <p className="text-base sm:text-lg text-white/90 dark:text-white/95 mb-4 sm:mb-6 max-w-lg mx-auto lg:mx-0">
                    {lender.tagline}
                  </p>
                )}
              </div>

              {/* CTA Button - Full width on mobile */}
              <div className="w-full sm:w-auto flex-shrink-0">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-white dark:bg-white text-green-700 dark:text-green-800 hover:bg-neutral-100 dark:hover:bg-neutral-200 text-base sm:text-lg px-6 py-3"
                  onClick={handleRequestLoan}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Request a Loan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-white/70 dark:text-white/80 text-xs sm:text-sm mt-2 sm:mt-3 text-center lg:text-left">
                  No hidden fees • No credit check
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Mobile: Quick Action Card at top */}
          <div className="lg:hidden mb-6">
            <div className="bg-green-600 dark:bg-green-700 rounded-xl p-5 sm:p-6">
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-full bg-white/20 dark:bg-white/30 flex items-center justify-center">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2">Ready to apply?</h3>
                <p className="text-green-100 dark:text-green-200 text-sm mb-4">
                  Get a decision in minutes. No obligation.
                </p>
                <Button 
                  className="w-full bg-white dark:bg-white text-green-700 dark:text-green-800 hover:bg-neutral-100 dark:hover:bg-neutral-200"
                  onClick={handleRequestLoan}
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Apply Now
                </Button>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-green-200 dark:text-green-300 text-xs sm:text-sm mt-4">
                  <span>✓ No credit check</span>
                  <span>✓ Funds in 24h</span>
                  <span>✓ Flexible terms</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:w-2/3 space-y-5 sm:space-y-6">
              {/* About Section */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                    About {lender.business_name}
                  </h2>
                </div>
                
                {lender.description ? (
                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {lender.description}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 italic">
                    No description provided.
                  </p>
                )}
              </div>

              {/* Lending Terms */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">Lending Terms</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">Loan Range</p>
                        <p className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                          {formatCurrency(lender.min_loan_amount || 50)} - {formatCurrency(lender.max_loan_amount || 5000)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                        <Percent className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">Interest Rate</p>
                        <p className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-white">
                          {formatPercentage(lender.default_interest_rate || 0)} APR
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">Processing</p>
                        <p className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-white">24-48 hours</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature Highlight */}
                <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white mb-1">
                        First-time borrower friendly
                      </h4>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                        {lender.business_name} specializes in helping first-time borrowers build credit history.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">How It Works</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      step: 1,
                      title: "Apply Online",
                      description: "Complete a simple 5-minute application.",
                      icon: FileText
                    },
                    {
                      step: 2,
                      title: "Get Approved",
                      description: "Receive a decision within 24 hours.",
                      icon: CheckCircle
                    },
                    {
                      step: 3,
                      title: "Receive Funds",
                      description: "Money sent directly to your account.",
                      icon: TrendingUp
                    }
                  ].map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.step} className="relative">
                        <div className="absolute -top-2 left-3 sm:left-4 z-10">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-600 dark:bg-green-700 text-white text-sm font-bold flex items-center justify-center border-2 border-white dark:border-neutral-900">
                            {step.step}
                          </div>
                        </div>
                        <div className="pt-5 sm:pt-6 p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 sm:mb-3">
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white mb-1">{step.title}</h3>
                          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contact Info - Mobile only */}
              <div className="lg:hidden bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Contact</h3>
                </div>

                <div className="space-y-2">
                  {lender.contact_email && (
                    <a 
                      href={`mailto:${lender.contact_email}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Email</p>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 truncate">{lender.contact_email}</p>
                      </div>
                    </a>
                  )}
                  
                  {lender.contact_phone && (
                    <a 
                      href={`tel:${lender.contact_phone}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Phone</p>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{lender.contact_phone}</p>
                      </div>
                    </a>
                  )}
                  
                  {lender.website_url && (
                    <a 
                      href={lender.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Website</p>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 truncate">
                          {lender.website_url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                    </a>
                  )}
                </div>
              </div>

              {/* Trust Signals - Mobile only */}
              <div className="lg:hidden bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Trust & Safety</h4>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Verified and monitored by Feyza
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">Verified</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Shield className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">Secure</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Clock className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">Fast</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Star className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-[10px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300">4.8★</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar (Desktop only) */}
            <div className="hidden lg:block lg:w-1/3 space-y-6">
              {/* Quick Action Card */}
              <div className="bg-green-600 dark:bg-green-700 rounded-xl border border-green-600 dark:border-green-700 p-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/20 dark:bg-white/30 flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Ready to apply?</h3>
                  <p className="text-green-100 dark:text-green-200 mb-4">
                    Get a decision in minutes. No obligation.
                  </p>
                  <Button 
                    className="w-full bg-white dark:bg-white text-green-700 dark:text-green-800 hover:bg-neutral-100 dark:hover:bg-neutral-200"
                    onClick={handleRequestLoan}
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Apply Now
                  </Button>
                  <p className="text-green-200 dark:text-green-300 text-sm mt-4">
                    ✓ No credit check required<br />
                    ✓ Funds in 24 hours<br />
                    ✓ Flexible repayment
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Contact Information</h3>
                </div>

                <div className="space-y-3">
                  {lender.contact_email && (
                    <a 
                      href={`mailto:${lender.contact_email}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Email</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{lender.contact_email}</p>
                      </div>
                    </a>
                  )}
                  
                  {lender.contact_phone && (
                    <a 
                      href={`tel:${lender.contact_phone}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Phone</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{lender.contact_phone}</p>
                      </div>
                    </a>
                  )}
                  
                  {lender.website_url && (
                    <a 
                      href={lender.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Website</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{lender.website_url.replace(/^https?:\/\//, '')}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    </a>
                  )}
                </div>
              </div>

              {/* Trust Signals */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Trust & Safety</h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    This lender is verified and monitored by Feyza
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Verified</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Shield className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Secure</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Clock className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Fast</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Star className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">4.8★</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom CTA - Mobile only */}
        <div className="z-100 lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 safe-area-inset-bottom">
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white py-3"
            onClick={handleRequestLoan}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Request a Loan from {lender.business_name}
          </Button>
        </div>

        {/* Spacer for fixed bottom CTA on mobile */}
        <div className="lg:hidden h-20" />
      </main>

      <Footer />
    </div>
  );
}