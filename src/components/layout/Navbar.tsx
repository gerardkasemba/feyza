'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, formatRelativeDate } from '@/lib/utils';
import { Avatar, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  Home,
  Target,
  FileText,
  Building2,
  Bell,
  CheckCheck,
  Loader2,
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
  TrendingUp,
  Info,
  BarChart3,
  LogIn,
  Star
} from 'lucide-react';

interface NavbarProps {
  user?: {
    id: string;
    email: string;
    full_name: string;
    user_type?: 'individual' | 'business';
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

// Lightweight theme hook — only reads/writes localStorage and syncs the icon.
// The layout.tsx inline script already applies the class to <html> before paint,
// so this hook must NOT touch document.documentElement on mount to avoid fighting it.
function useThemeToggle() {
  const getSystemTheme = (): 'light' | 'dark' =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('feyza-theme') as 'light' | 'dark' | 'system' | null;
    if (stored) setThemeState(stored);
    setMounted(true);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? getSystemTheme() : theme;

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem('feyza-theme', newTheme);
    // Apply to DOM only on explicit user toggle, not on page load
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  };

  return { theme, resolvedTheme, setTheme, mounted };
}

export function Navbar({ user: initialUser = null }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [user, setUser] = useState(initialUser);
  // When no initialUser, wait for first auth check before showing guest vs logged-in to avoid blink
  const [authChecked, setAuthChecked] = useState(!!initialUser);
  const [loading, setLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notificationList, setNotificationList] = useState<Array<{ id: string; type: string; title: string; message: string; is_read: boolean; loan_id?: string; created_at: string }>>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme, mounted } = useThemeToggle();

  // Guest links with icons
  const guestLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/pricing', label: 'Pricing', icon: TrendingUp },
    { href: '/about', label: 'About', icon: Info },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setUserDropdownOpen(false);
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(target)) setThemeDropdownOpen(false);
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(target)) setNotificationDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user
  useEffect(() => {
    const supabase = createClient();
    
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setUser(null); setAuthChecked(true); return; }
        if (initialUser?.id === authUser.id) { setUser(initialUser); setAuthChecked(true); return; }

        const { data: profile } = await supabase
          .from('users')
          .select('id, email, full_name, user_type, avatar_url')
          .eq('id', authUser.id)
          .single();
        
        setUser(profile || null);
      } catch { setUser(null); }
      setAuthChecked(true);
    };

    if (!initialUser) fetchUser();
    else setUser(initialUser);

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
    
    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setNotificationCount(count ?? 0);
    };
    const fetchList = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, is_read, loan_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotificationList(data || []);
    };
    fetchCount();
    fetchList();
    
    // Realtime subscriptions
    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 2000);
        fetchCount();
        fetchList();
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
      return [...baseItems, { href: '/business', label: 'Business', icon: Building2 }, { href: '/lender/matches', label: 'Loan Matches', icon: Target }];
    }
    return [...baseItems, ];
    // return [...baseItems, { href: '/invest', label: 'Invest', icon: DollarSign }];
  }, [user]);

const userMenuItems: MenuItem[] = React.useMemo(() => {
  if (!user) return [];
  
  const baseItems: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/vouch/requests', label: 'Vouch', icon: Star },
    // { href: '/profile', label: 'My Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];
  
  // Add business-specific items
  if (user.user_type === 'business') {
    baseItems.push(
      { href: '/lender/matches', label: 'Loan Matches', icon: Target },
      { href: '/business/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/lender/preferences', label: 'Lending Preferences', icon: CreditCard },
      { href: '/business/settings', label: 'Business Settings', icon: Briefcase }
    );
  }
  
  // Add common items
  baseItems.push(
    // { href: '/help', label: 'Help & Support', icon: HelpCircle },
    { type: 'divider' },
    { label: 'Sign Out', icon: LogOut, onClick: handleSignOut, danger: true } as ActionItem
  );
  
  return baseItems;
}, [user]);

  const isNavItem = (item: MenuItem): item is NavItem => 'href' in item;
  const isActionItem = (item: MenuItem): item is ActionItem => 'onClick' in item;
  const isDividerItem = (item: MenuItem): item is DividerItem => 'type' in item && item.type === 'divider';

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Sun;

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
                    {[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }].map((option) => {
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

            {!authChecked ? (
              <div className="flex items-center gap-2 h-10 px-2 opacity-60" aria-hidden="true">
                <div className="w-20 h-6 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
              </div>
            ) : user ? (
              <>
                <Link href="/loans/new" className="hidden sm:block" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25">
                    <Plus className="w-4 h-4 mr-1" />{user.user_type === 'business' ? 'Create Loan' : 'Request Loan'}
                  </Button>
                </Link>

                <div className="relative" ref={notificationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => { setNotificationDropdownOpen(!notificationDropdownOpen); setUserDropdownOpen(false); setMobileMenuOpen(false); }}
                    className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                    aria-label={notificationCount > 0 ? `Notifications (${notificationCount} unread)` : 'Notifications'}
                  >
                    <Bell className="w-5 h-5 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </button>
                  {notificationDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-[100]">
                      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {notificationCount > 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                setMarkingAllRead(true);
                                try {
                                  const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
                                  if (res.ok) {
                                    setNotificationCount(0);
                                    setNotificationList((prev) => prev.map((n) => ({ ...n, is_read: true })));
                                  }
                                } finally {
                                  setMarkingAllRead(false);
                                }
                              }}
                              disabled={markingAllRead}
                              className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline disabled:opacity-50 flex items-center gap-1"
                            >
                              {markingAllRead ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                              Mark all read
                            </button>
                          )}
                          <Link href="/notifications" onClick={() => setNotificationDropdownOpen(false)} className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline">
                            View all
                          </Link>
                        </div>
                      </div>
                      <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
                        {notificationList.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                            No notifications yet
                          </div>
                        ) : (
                          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {notificationList.map((n) => (
                              <Link
                                key={n.id}
                                href={n.loan_id ? `/loans/${n.loan_id}` : '/notifications'}
                                onClick={() => setNotificationDropdownOpen(false)}
                                className={cn(
                                  'block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left',
                                  !n.is_read && 'bg-green-50/50 dark:bg-green-900/10'
                                )}
                              >
                                <p className={cn('text-sm', !n.is_read && 'font-medium')}>{n.title}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{formatRelativeDate(n.created_at)}</p>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
            {!authChecked ? (
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="w-24 h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  <div className="w-32 h-3 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                </div>
              </div>
            ) : user ? (
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