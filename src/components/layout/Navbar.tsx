'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  Home,
  FileText,
  Building2,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  User,
  DollarSign,
  Briefcase,
  ChevronDown,
  HelpCircle,
  CreditCard,
  LucideIcon,
  Moon,
  Sun,
  Monitor,
  TrendingUp,
  Info,
  CreditCard as PayIcon,
  TrendingUp as TrackIcon,
  LogIn,
} from 'lucide-react';

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    full_name: string;
    user_type: 'individual' | 'business';
    avatar_url?: string;
  } | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface DividerItem {
  type: 'divider';
}

interface ActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

type MenuItem = NavItem | DividerItem | ActionItem;

// Theme hook
function useThemeToggle() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  useEffect(() => {
    const stored = localStorage.getItem('feyza-theme') as 'light' | 'dark' | 'system' | null;
    if (stored) setThemeState(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(resolved);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('feyza-theme', newTheme);
  };

  return { theme, resolvedTheme, setTheme, mounted };
}

export function Navbar({ user: initialUser = null }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [guestLoansDropdownOpen, setGuestLoansDropdownOpen] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [liveIndicator, setLiveIndicator] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const guestLoansDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme, mounted } = useThemeToggle();

  // Guest links with icons
  const guestLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/pricing', label: 'Pricing', icon: TrendingUp },
    { href: '/about', label: 'About', icon: Info },
  ];

  // My Loans dropdown items for guests
  const guestLoansItems = [
    { href: '/borrower/access', label: 'Pay My Loan', icon: PayIcon },
    { href: '/lender/access', label: 'Track What I\'m Owed', icon: TrackIcon },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (guestLoansDropdownRef.current && !guestLoansDropdownRef.current.contains(event.target as Node)) {
        setGuestLoansDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user
  useEffect(() => {
    const supabase = createClient();
    
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setUser(null); setLoading(false); return; }
        if (initialUser?.id === authUser.id) { setUser(initialUser); setLoading(false); return; }

        const { data: profile } = await supabase
          .from('users')
          .select('id, email, full_name, user_type, avatar_url')
          .eq('id', authUser.id)
          .single();
        
        setUser(profile || null);
      } catch { setUser(null); }
      finally { setLoading(false); }
    };

    if (!initialUser) fetchUser();
    else { setUser(initialUser); setLoading(false); }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('users')
            .select('id, email, full_name, user_type, avatar_url')
            .eq('id', session.user.id)
            .single();
          if (profile) setUser(profile);
        }, 100);
      } else if (event === 'SIGNED_OUT') setUser(null);
    });

    return () => subscription.unsubscribe();
  }, [initialUser]);

  // Live notifications with Supabase Realtime
  useEffect(() => {
    if (!user) { setNotificationCount(0); return; }
    
    const supabase = createClient();
    
    const fetchNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setNotificationCount(count || 0);
    };
    
    fetchNotifications();
    
    // Realtime subscriptions
    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 2000);
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans', filter: `borrower_id=eq.${user.id}` }, () => {
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 2000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans', filter: `lender_id=eq.${user.id}` }, () => {
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 2000);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => {
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 2000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
  };

  const navItems: NavItem[] = React.useMemo(() => {
    if (!user) return [];
    const baseItems: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/loans', label: 'My Loans', icon: FileText },
    ];
    if (user.user_type === 'business') {
      // return [...baseItems, { href: '/business', label: 'Business', icon: Building2 }, { href: '/invest', label: 'Invest', icon: DollarSign }];
      return [...baseItems, { href: '/business', label: 'Business', icon: Building2 }];
    }
    return [...baseItems, ];
    // return [...baseItems, { href: '/invest', label: 'Invest', icon: DollarSign }];
  }, [user]);

const userMenuItems: MenuItem[] = React.useMemo(() => {
  if (!user) return [];
  
  const baseItems: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    // { href: '/profile', label: 'My Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  // Add business-specific items
  if (user.user_type === 'business') {
    baseItems.push(
      { href: '/lender/preferences', label: 'Lending Preferences', icon: CreditCard },
      { href: '/business/settings', label: 'Business Settings', icon: Briefcase }
    );
  }
  
  // Add common items
  baseItems.push(
    { href: '/help', label: 'Help & Support', icon: HelpCircle },
    { type: 'divider' },
    { label: 'Sign Out', icon: LogOut, onClick: handleSignOut, danger: true } as ActionItem
  );
  
  return baseItems;
}, [user]);

  const isNavItem = (item: MenuItem): item is NavItem => 'href' in item;
  const isActionItem = (item: MenuItem): item is ActionItem => 'onClick' in item;
  const isDividerItem = (item: MenuItem): item is DividerItem => 'type' in item && item.type === 'divider';

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  if (loading && !initialUser) {
    return (
      <nav className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
              <div className="w-16 h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse hidden sm:block" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
              <div className="w-24 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse hidden sm:block" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group" onClick={() => { setMobileMenuOpen(false); setUserDropdownOpen(false); }}>
              <Image src="/feyza.svg" height={80} width={80} alt="feyza" />
              {liveIndicator && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Live
                </span>
              )}
            </Link>

            {/* Desktop Nav */}
            {user && (
              <div className="hidden md:flex items-center gap-1 ml-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                      className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent')}>
                      <Icon className="w-4 h-4" />{item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            {mounted && (
              <div className="relative" ref={themeDropdownRef}>
                <button onClick={() => setThemeDropdownOpen(!themeDropdownOpen)} className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Toggle theme">
                  <ThemeIcon className="w-5 h-5" />
                </button>
                {themeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 animate-fade-in z-50">
                    {[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button key={option.value} onClick={() => { setTheme(option.value as any); setThemeDropdownOpen(false); }}
                          className={cn('w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                            theme === option.value ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700')}>
                          <Icon className="w-4 h-4" />{option.label}
                          {theme === option.value && <span className="ml-auto text-green-600">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <>
                <Link href="/loans/new" className="hidden sm:block" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25">
                    <Plus className="w-4 h-4 mr-1" />{user.user_type === 'business' ? 'Create Loan' : 'Request Loan'}
                  </Button>
                </Link>

                <Link href="/notifications" className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group" aria-label="Notifications" onClick={() => { setMobileMenuOpen(false); setUserDropdownOpen(false); }}>
                  <Bell className="w-5 h-5 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                  {notificationCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => { setUserDropdownOpen(!userDropdownOpen); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group" aria-label="User menu">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-medium text-neutral-900 dark:text-white leading-none truncate max-w-[120px]">{user.full_name || 'User'}</span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{user.user_type}</span>
                    </div>
                    <div className="relative">
                      <Avatar name={user.full_name} size="sm" src={user?.avatar_url} className="border-2 border-transparent group-hover:border-green-200 dark:group-hover:border-green-800 transition-colors" />
                      <ChevronDown className={cn("w-3 h-3 absolute -bottom-1 -right-1 bg-white dark:bg-neutral-800 rounded-full text-neutral-400 transition-transform", userDropdownOpen && "rotate-180")} />
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 animate-fade-in z-50">
                      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.full_name} size="md" src={user?.avatar_url} className="border-2 border-green-100 dark:border-green-800" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{user.full_name || 'User'}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full capitalize">{user.user_type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="py-1">
                        {userMenuItems.map((item, index) => {
                          if (isDividerItem(item)) return <div key={index} className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />;
                          const Icon = item.icon;
                          if (isActionItem(item)) {
                            return (
                              <button key={item.label} onClick={item.onClick}
                                className={cn('w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left',
                                  item.danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700')}>
                                <Icon className="w-4 h-4" />{item.label}
                              </button>
                            );
                          }
                          if (isNavItem(item)) {
                            return (
                              <Link key={item.label} href={item.href} onClick={() => { setUserDropdownOpen(false); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                                <Icon className="w-4 h-4" />{item.label}
                              </Link>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setUserDropdownOpen(false); }} className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Toggle menu">
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <>
                {/* Desktop Guest Links */}
                <div className="hidden md:flex items-center gap-1">
                  {guestLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
                    return (
                      <Link key={link.href} href={link.href} 
                        className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent')}>
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{link.label}</span>
                      </Link>
                    );
                  })}

                  {/* My Loans Dropdown for Guests */}
                  <div className="relative" ref={guestLoansDropdownRef}>
                    <button 
                      onClick={() => setGuestLoansDropdownOpen(!guestLoansDropdownOpen)} 
                      className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        guestLoansDropdownOpen || pathname?.startsWith('/borrower/access') 
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent')}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden lg:inline">My Loans</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", guestLoansDropdownOpen && "rotate-180")} />
                    </button>

                    {guestLoansDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 animate-fade-in z-50">
                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700">
                          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Guest Access</p>
                        </div>
                        <div className="py-1">
                          {guestLoansItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                              <Link 
                                key={item.href} 
                                href={item.href} 
                                onClick={() => { setGuestLoansDropdownOpen(false); setMobileMenuOpen(false); }}
                                className={cn('flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                                  isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700')}
                              >
                                <Icon className="w-4 h-4" />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-2 mt-1">
                          <Link 
                            href="/auth/signin" 
                            onClick={() => { setGuestLoansDropdownOpen(false); }}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            Sign in for full access
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href="/auth/signin">
                    <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      <span className="hidden lg:inline">Sign In</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="sm:hidden p-2">
                      <LogIn className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="hidden sm:inline-flex bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span className="hidden lg:inline">Get Started</span>
                      <span className="lg:hidden">Sign Up</span>
                    </Button>
                    <Button size="sm" className="sm:hidden bg-gradient-to-r from-green-500 to-green-600 p-2">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                {/* Mobile Menu Toggle for Guests */}
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" aria-label="Toggle menu">
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {/* User Info Section (if logged in) */}
            {user ? (
              <>
                <div className="px-4 py-3 mb-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.full_name} size="md" src={user?.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate">{user.full_name || 'User'}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                      className={cn('flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800')}>
                      <Icon className="w-5 h-5" />{item.label}
                    </Link>
                  );
                })}
                
                <Link href="/loans/new" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <Plus className="w-5 h-5" />{user.user_type === 'business' ? 'Create Loan' : 'Request Loan'}
                </Link>

                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 mt-2">
                  <h3 className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Account</h3>
                  {userMenuItems.filter(item => !isDividerItem(item) && !(isActionItem(item) && item.danger)).map((item, index) => {
                    if (isNavItem(item)) {
                      const Icon = item.icon;
                      return <Link key={index} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"><Icon className="w-5 h-5" />{item.label}</Link>;
                    }
                    return null;
                  })}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 mt-2 pt-2">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <LogOut className="w-5 h-5" />Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Guest Mobile Menu */
              <>
                <div className="space-y-1">
                  {guestLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
                    return (
                      <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                        className={cn('flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                          isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800')}>
                        <Icon className="w-5 h-5" />
                        {link.label}
                      </Link>
                    );
                  })}
                  
                  {/* My Loans Dropdown for Guests - Mobile */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2 mt-2">
                    <h3 className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">My Loans</h3>
                    {guestLoansItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                          className={cn('flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors',
                            isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800')}>
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2 space-y-2">
                  <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </Link>
                  <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700">
                    <Plus className="w-5 h-5" />
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}