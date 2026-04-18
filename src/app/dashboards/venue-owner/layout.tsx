
import { verifyVenueOwnerAccess } from '@/lib/dal';
import VenueOwnerDashboardClientLayout from './VenueOwnerDashboardClientLayout';
import { redirect } from 'next/navigation';
import { isVenuesEnabled } from '@/lib/network';

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!isVenuesEnabled()) {
    redirect('/dashboards/user');
  }

  // 🔒 SERVER GUARD: This runs on the server.
  // If the user isn't a venue owner, it redirects internally before rendering.
  await verifyVenueOwnerAccess();

  return (
    <VenueOwnerDashboardClientLayout>
      {children}
    </VenueOwnerDashboardClientLayout>
  );
}
