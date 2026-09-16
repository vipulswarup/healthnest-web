import { redirect } from 'next/navigation';
import { DashboardHome } from '@/components/dashboard/DashboardHome';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { loadDashboardHome } from '@/lib/dashboard/load-home';

export default async function DashboardPage() {
  const authed = await getAuthenticatedUser();
  if (!authed) redirect('/auth/signin');

  const home = await loadDashboardHome(authed.id, authed.email);
  if (!home.acknowledged) redirect('/beta-acknowledgement');

  const firstName = authed.name.trim().split(/\s+/)[0] || '';
  return <DashboardHome firstName={firstName} userLabel={authed.email} initial={home} />;
}
