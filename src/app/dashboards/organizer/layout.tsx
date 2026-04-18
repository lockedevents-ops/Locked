
import { verifyOrganizerAccess } from '@/lib/dal';
import OrganizerDashboardClientLayout from './OrganizerDashboardClientLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  // 🔒 SERVER GUARD: This runs on the server.
  // If the user isn't an organizer, it redirects internally before rendering.
  await verifyOrganizerAccess();

  return (
    <OrganizerDashboardClientLayout>
      {children}
    </OrganizerDashboardClientLayout>
  );
}
