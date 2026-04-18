
import { verifyAuth } from '@/lib/dal';
import UserDashboardClientLayout from './UserDashboardClientLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
  // 🔒 SERVER GUARD: This runs on the server.
  // It verifies the token and redirects to login if invalid.
  await verifyAuth();

  return (
    <UserDashboardClientLayout>
      {children}
    </UserDashboardClientLayout>
  );
}
