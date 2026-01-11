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
  Sparkles,
  DollarSign as DollarSignIcon,
  Users,
  BarChart,
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
  showIcon?: boolean;
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

export function Navbar({ user: initialUser = null }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // ✅ Loans dropdown state (GUEST ONLY, desktop)
  const [loansDropdownOpen, setLoansDropdownOpen] = useState(false);

  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const loansDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }

      if (loansDropdownRef.current && !loansDropdownRef.current.contains(target)) {
        setLoansDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setLoansDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Fetch user on mount if not provided
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const supabase = createClient();

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (initialUser?.id === authUser.id) {
          setUser(initialUser);
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('users')
          .select('id, email, full_name, user_type, avatar_url')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        } else if (profile) {
          setUser(profile);
        }
      } catch (error) {
        console.error('Error in fetchUser:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (!initialUser) {
      fetchUser();
    } else {
      setUser(initialUser);
      setLoading(false);
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('users')
            .select('id, email, full_name, user_type, avatar_url')
            .eq('id', session.user.id)
            .single();

          if (profile) setUser(profile);
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialUser]);

  // ✅ FIXED: notification realtime subscription (3 args: type, filter, callback)
  useEffect(() => {
    if (!user) {
      setNotificationCount(0);
      return;
    }

    const supabase = createClient();

    const fetchNotifications = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);

        setNotificationCount(count || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      setUserDropdownOpen(false);
      setLoansDropdownOpen(false);
      setMobileMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const guestNavItems: NavItem[] = React.useMemo(
    () => [
      { href: '/', label: 'Home', icon: Home, showIcon: true },
      { href: '/pricing', label: 'Pricing', icon: DollarSignIcon, showIcon: true },
      { href: '/about', label: 'About', icon: Users, showIcon: true },
      { href: '/learn', label: 'Learn', icon: BarChart, showIcon: true },
    ],
    []
  );

  // Auth nav items (NO loans dropdown for logged in)
  const authNavItems: NavItem[] = React.useMemo(() => {
    if (!user) return [];

    const baseItems: NavItem[] = [{ href: '/dashboard', label: 'Dashboard', icon: Home }];

    if (user.user_type === 'business') {
      return [
        ...baseItems,
        { href: '/business', label: 'Business', icon: Building2 },
        { href: '/loans', label: 'My Loans', icon: DollarSign },
      ];
    }

    return [...baseItems, { href: '/loans', label: 'Loans', icon: DollarSign }];
  }, [user]);

  const userMenuItems: MenuItem[] = React.useMemo(() => {
    if (!user) return [];

    const items: MenuItem[] = [
      { href: '/profile', label: 'My Profile', icon: User },
      { href: '/settings', label: 'Settings', icon: Settings },
    ];

    if (user.user_type === 'business') {
      (items as NavItem[]).push({
        href: '/business/settings',
        label: 'Business Settings',
        icon: Briefcase,
      });
    }

    (items as NavItem[]).push({
      href: '/lender/preferences',
      label: 'Lending Preferences',
      icon: CreditCard,
    });

    items.push(
      { href: '/help', label: 'Help & Support', icon: HelpCircle },
      { type: 'divider' },
      {
        label: 'Sign Out',
        icon: LogOut,
        onClick: handleSignOut,
        danger: true,
      } as ActionItem
    );

    return items;
  }, [user]);

  const isNavItem = (item: MenuItem): item is NavItem => 'href' in item;
  const isActionItem = (item: MenuItem): item is ActionItem => 'onClick' in item;
  const isDividerItem = (item: MenuItem): item is DividerItem => 'type' in item && item.type === 'divider';

  if (loading && !initialUser) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neutral-200 rounded-lg animate-pulse" />
              <div className="w-24 h-6 bg-neutral-200 rounded animate-pulse hidden sm:block" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-9 bg-neutral-200 rounded animate-pulse" />
              <div className="w-9 h-9 bg-neutral-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // "Loans" active only for guest access routes
  const loansActive = pathname?.startsWith('/borrower/access') || pathname?.startsWith('/lender/access');

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={() => {
                setMobileMenuOpen(false);
                setUserDropdownOpen(false);
                setLoansDropdownOpen(false);
              }}
            >
              {/* <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">$</span>
              </div> */}
              <Image src="./feyza.svg" height={80} width={80} alt="Feyza Logo"/>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 ml-8">
              {user ? (
                // ✅ Logged in: normal nav items
                authNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700 border border-primary-100'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                      )}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLoansDropdownOpen(false);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })
              ) : (
                // ✅ Guest: guest nav + Loans dropdown
                <>
                  {guestNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 border border-primary-100'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                        )}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setLoansDropdownOpen(false);
                        }}
                      >
                        {item.showIcon && <Icon className="w-4 h-4" />}
                        {item.label}
                      </Link>
                    );
                  })}

                  {/* ✅ Guest Loans Dropdown */}
                  <div className="relative" ref={loansDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setLoansDropdownOpen((v) => !v);
                        setUserDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        loansActive
                          ? 'bg-primary-50 text-primary-700 border border-primary-100'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                      )}
                      aria-haspopup="menu"
                      aria-expanded={loansDropdownOpen}
                    >
                      <FileText className="w-4 h-4" />
                      Loans
                      <ChevronDown className={cn('w-4 h-4 transition-transform', loansDropdownOpen && 'rotate-180')} />
                    </button>

                    {loansDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-64 bg-white border border-neutral-200 rounded-xl shadow-lg z-50">
                        <Link
                          href="/borrower/access"
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 rounded-t-xl',
                            pathname?.startsWith('/borrower/access') && 'bg-primary-50 text-primary-700'
                          )}
                          onClick={() => setLoansDropdownOpen(false)}
                        >
                          <DollarSign className="w-4 h-4 text-primary-600" />
                          Pay your loan
                        </Link>

                        <Link
                          href="/lender/access"
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 rounded-b-xl',
                            pathname?.startsWith('/lender/access') && 'bg-primary-50 text-primary-700'
                          )}
                          onClick={() => setLoansDropdownOpen(false)}
                        >
                          <Briefcase className="w-4 h-4 text-primary-600" />
                          Manage as lender
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* CTA */}
                <Link
                  href="/loans/new"
                  className="hidden sm:block"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLoansDropdownOpen(false);
                  }}
                >
                  <Button size="sm" className="shadow-sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {user.user_type === 'business' ? 'Create Loan' : 'Request Loan'}
                  </Button>
                </Link>

                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors group"
                  aria-label="Notifications"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setUserDropdownOpen(false);
                    setLoansDropdownOpen(false);
                  }}
                >
                  <Bell className="w-5 h-5 group-hover:text-primary-600 transition-colors" />
                  {notificationCount > 0 && (
                    <>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                      <span className="sr-only">
                        {notificationCount} unread notification{notificationCount !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen((v) => !v);
                      setLoansDropdownOpen(false);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors group"
                    aria-label="User menu"
                    aria-expanded={userDropdownOpen}
                  >
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-medium text-neutral-900 leading-none truncate max-w-[120px]">
                        {user.full_name || 'User'}
                      </span>
                      <span className="text-xs text-neutral-500 capitalize">{user.user_type}</span>
                    </div>
                    <div className="relative">
                      <Avatar
                        name={user.full_name}
                        size="sm"
                        src={user?.avatar_url}
                        className="border-2 border-transparent group-hover:border-primary-200 transition-colors"
                      />
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 absolute -bottom-1 -right-1 bg-white rounded-full text-neutral-400 transition-transform',
                          userDropdownOpen && 'rotate-180'
                        )}
                      />
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 animate-fade-in z-50">
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.full_name}
                            size="md"
                            src={user?.avatar_url}
                            className="border-2 border-primary-100"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 truncate">{user.full_name || 'User'}</p>
                            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full capitalize">
                              {user.user_type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        {userMenuItems.map((item, index) => {
                          if (isDividerItem(item)) return <div key={index} className="h-px bg-neutral-100 my-1" />;

                          const Icon = item.icon;
                          if (isActionItem(item)) {
                            return (
                              <button
                                key={item.label}
                                onClick={item.onClick}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left',
                                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-100'
                                )}
                                type="button"
                              >
                                <Icon className="w-4 h-4" />
                                {item.label}
                              </button>
                            );
                          }

                          if (isNavItem(item)) {
                            return (
                              <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => {
                                  setUserDropdownOpen(false);
                                  setLoansDropdownOpen(false);
                                  setMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
                              >
                                <Icon className="w-4 h-4" />
                                {item.label}
                              </Link>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile menu button */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen((v) => !v);
                    setUserDropdownOpen(false);
                    setLoansDropdownOpen(false);
                  }}
                  className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Link href="/auth/signin">
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="hidden sm:inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Get Started
                    </Button>
                    <Button size="sm" className="sm:hidden flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Sign Up
                    </Button>
                  </Link>
                </div>

                {/* Mobile menu button */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen((v) => !v);
                    setUserDropdownOpen(false);
                    setLoansDropdownOpen(false);
                  }}
                  className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {user ? (
              <>
                {/* Logged-in mobile menu */}
                <div className="px-4 py-3 mb-2 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.full_name} size="md" src={user?.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{user.full_name || 'User'}</p>
                      <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full capitalize">
                        {user.user_type}
                      </span>
                    </div>
                  </div>
                </div>

                {authNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}

                <Link
                  href="/loans/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors mt-2"
                >
                  <Plus className="w-5 h-5" />
                  {user.user_type === 'business' ? 'Create Loan' : 'Request Loan'}
                </Link>

                <div className="border-t border-neutral-100 pt-2 mt-2">
                  <h3 className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Account</h3>

                  {userMenuItems
                    .filter((item) => !isDividerItem(item) && !(isActionItem(item) && item.danger))
                    .map((item, index) => {
                      if (isNavItem(item)) {
                        const Icon = item.icon;
                        const isMainNavItem = authNavItems.some((navItem) => navItem.href === item.href);
                        if (isMainNavItem) return null;

                        return (
                          <Link
                            key={index}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                          >
                            <Icon className="w-5 h-5" />
                            {item.label}
                          </Link>
                        );
                      }
                      return null;
                    })}

                  <div className="border-t border-neutral-100 mt-2 pt-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      type="button"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Guest mobile menu */}
                {/* <div className="px-4 py-3 mb-2 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">L</span>
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Welcome to FeyZa</p>
                      <p className="text-sm text-neutral-500">Access loans or Loans today</p>
                    </div>
                  </div>
                </div> */}

                {guestNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-600 hover:bg-neutral-100'
                      )}
                    >
                      {item.showIcon && <Icon className="w-5 h-5" />}
                      {item.label}
                    </Link>
                  );
                })}

                {/* Guest Loans Section */}
                <div className="border-t border-neutral-100 pt-2 mt-2">
                  <h3 className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Loans</h3>

                  <Link
                    href="/borrower/access"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      pathname?.startsWith('/borrower/access')
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    )}
                  >
                    <DollarSign className="w-5 h-5" />
                    Pay your loan
                  </Link>

                  <Link
                    href="/lender/access"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      pathname?.startsWith('/lender/access')
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    )}
                  >
                    <Briefcase className="w-5 h-5" />
                    Manage as lender
                  </Link>
                </div>

                <div className="border-t border-neutral-100 pt-2 mt-2">
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors mt-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Get Started Free
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
