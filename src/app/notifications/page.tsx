import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { NotificationsPageClient, NotificationsView } from '@/components/notifications';
import type { NotificationRecord } from '@/components/notifications';

export const revalidate = 10;

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const [profileResult, notificationsResult] = await Promise.all([
    supabase.from('users').select('id, email, full_name, user_type, avatar_url').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('id, user_id, loan_id, type, title, message, is_read, created_at, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const profile = profileResult.data;
  const notifications = (notificationsResult.data || []) as NotificationRecord[];

  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    user_type: user.user_metadata?.user_type || 'individual',
    avatar_url: null,
  };

  return (
    <NotificationsPageClient userId={user.id}>
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={userProfile} />

        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <NotificationsView notifications={notifications} userId={user.id} />
          </div>
        </main>

        <Footer />
      </div>
    </NotificationsPageClient>
  );
}
