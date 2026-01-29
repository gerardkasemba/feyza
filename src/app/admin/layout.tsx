'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  ClipboardCheck,
  Percent,
  Globe,
  Ban,
  CreditCard,
  BarChart3,
  Tags,
  Clock,
  Moon,
  Sun,
  RefreshCw,
  MapPin,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/blocked', label: 'Blocked Borrowers', icon: Ban },
  { href: '/admin/verification', label: 'Pending Verification', icon: ClipboardCheck },
  { href: '/admin/loans', label: 'Loans', icon: FileText },
  { href: '/admin/payments', label: 'Payments & Retries', icon: CreditCard },
  { href: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { href: '/admin/loan-types', label: 'Loan Types', icon: Tags },
  { href: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { href: '/admin/cron', label: 'Cron Jobs', icon: Clock },
  { href: '/admin/countries', label: 'Countries', icon: Globe },
  { href: '/admin/states', label: 'States / Regions', icon: MapPin },
  { href: '/admin/platform-fee', label: 'Platform Fees', icon: Percent },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default to dark

  useEffect(() => {
    // Check for saved dark mode preference
    const savedMode = localStorage.getItem('admin-dark-mode');
    if (savedMode !== null) {
      const isDark = savedMode === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to dark mode
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin-dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin-dark-mode', 'false');
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/dashboard');
        return;
      }

      setUser(profile);
      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex items-center gap-3 text-white">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading admin panel...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={cn("min-h-screen", darkMode ? "dark" : "")}>
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-900 dark:bg-neutral-950 text-white flex items-center justify-between px-4 z-50 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 w-64 bg-neutral-900 dark:bg-neutral-950 text-white transform transition-transform duration-200 ease-in-out z-40 flex flex-col border-r border-neutral-800',
            'lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-neutral-800 shrink-0">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg">Feyza</span>
              <span className="text-xs text-neutral-400 block">Admin Panel</span>
            </div>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-white'
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-emerald-400" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-neutral-800 shrink-0 bg-neutral-900/50 dark:bg-neutral-950/50">
            <div className="flex items-center justify-between px-2 mb-3">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">Theme</span>
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dark</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-neutral-800/40">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-sm font-semibold text-white">
                  {user?.full_name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{user?.full_name || 'Admin'}</p>
                <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen bg-neutral-100 dark:bg-neutral-900 transition-colors">
          {children}
        </main>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
