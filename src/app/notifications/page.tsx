import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { Card, Badge } from '@/components/ui';
import { formatRelativeDate } from '@/lib/utils';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  AlertCircle,
  XCircle,
  ThumbsUp
} from 'lucide-react';

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch user profile
  let profile = null;
  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  } catch (error) {
    console.log('Users table may not exist yet');
  }

  // Fetch notifications
  let notifications: any[] = [];
  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    notifications = data || [];
  } catch (error) {
    console.log('Notifications table may not exist yet');
  }

  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    user_type: user.user_metadata?.user_type || 'individual',
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_received':
        return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' };
      case 'payment_confirmed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'loan_request':
        return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'loan_accepted':
        return { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-100' };
      case 'loan_declined':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      case 'reminder':
        return { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      default:
        return { icon: Bell, color: 'text-neutral-600', bg: 'bg-neutral-100' };
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={userProfile} />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900">Notifications</h1>
              <p className="text-neutral-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <form action="/api/notifications/mark-all-read" method="POST">
                <button 
                  type="submit"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Mark all as read
                </button>
              </form>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
                return (
                  <Link 
                    key={notification.id} 
                    href={notification.loan_id ? `/loans/${notification.loan_id}` : '#'}
                  >
                    <Card 
                      hover 
                      className={`flex items-start gap-4 ${!notification.is_read ? 'bg-primary-50/50 border-primary-100' : ''}`}
                    >
                      <div className={`p-3 rounded-xl ${bg}`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-neutral-900">{notification.title}</p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-neutral-400 mt-2">
                          {formatRelativeDate(notification.created_at)}
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-semibold text-neutral-900 mb-2">No notifications</h3>
              <p className="text-neutral-500">You're all caught up!</p>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
