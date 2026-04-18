"use client";

import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  Users, 
  CalendarCheck, 
  Building, 
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Database,
  Cog,
  User,
  Calendar,
  ChevronRight,
  Activity,
  Server,
  Globe,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { useFilteredStorageEvents } from '@/storage/events';
import { useRouter } from 'next/navigation';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { PageLoader } from '@/components/loaders/PageLoader';
import { createClient } from '@/lib/supabase/client/client';
import { useAdminDashboardData, useSystemHealth } from '@/hooks/adminQueries';
import { useSessionManagement } from '@/hooks/useSessionManagement';

// Dashboard metric card component
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change,
  changeType,
  linkTo 
}: { 
  title: string;
  value: number | string;
  icon: any;
  change?: number | null;
  changeType?: 'increase' | 'decrease' | 'neutral';
  linkTo: string;
}) => (
  <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-all hover:shadow-md">
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        
        {change !== undefined && (
          <div className={`text-xs font-medium rounded-full px-2 py-0.5 flex items-center ${
            changeType === 'increase' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
            changeType === 'decrease' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 
            'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200'
          }`}>
            <span>
              {change !== null && change !== undefined ? `${change > 0 ? '+' : ''}${change}%` : ''}
            </span>
          </div>
        )}
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{title}</p>
    </div>
    
    <div className="bg-gray-50 dark:bg-neutral-900 px-6 py-3 border-t border-gray-100 dark:border-neutral-800">
      <Link href={linkTo} className="text-primary hover:text-primary-dark text-sm font-medium flex items-center">
        View Details
        <ChevronRight className="ml-1 w-4 h-4" />
      </Link>
    </div>
  </div>
);

// Health Status Item Component
const HealthStatusItem = ({ label, value, icon: Icon, status }: { label: string, value?: string, icon: any, status: 'good' | 'warning' | 'bad' }) => {
  const colors = {
    good: { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-100 dark:border-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', indicator: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-900/20', text: 'text-amber-700 dark:text-amber-400', indicator: 'bg-amber-500' },
    bad: { bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-100 dark:border-rose-900/20', text: 'text-rose-700 dark:text-rose-400', indicator: 'bg-rose-500' },
  };
  
  const theme = colors[status];
  
  return (
    <div className={`flex flex-col p-4 rounded-xl border transition-all duration-200 ${theme.bg} ${theme.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${theme.text}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className={`w-2 h-2 rounded-full ${theme.indicator} shadow-[0_0_8px_rgba(0,0,0,0.3)] ${status !== 'good' ? 'animate-pulse' : ''}`} />
      </div>
      <div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`text-lg font-bold mt-0.5 ${theme.text}`}>{value || 'Unknown'}</div>
      </div>
    </div>
  );
};

// Quick access card component
const QuickAccessCard = ({
  title,
  description,
  icon: Icon,
  linkTo,
  color = 'primary'
}: {
  title: string;
  description: string;
  icon: any;
  linkTo: string;
  color?: 'primary' | 'blue' | 'green' | 'purple' | 'amber';
}) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  };
  
  return (
    <Link href={linkTo} className="block group">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6 hover:shadow-md transition-all h-full">
        <div className="flex items-start">
          <div className={`p-3 rounded-lg ${colorClasses[color]} mr-4`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function AdminDashboard() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on admin dashboard
  useSessionManagement();
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [isSupportAgent, setIsSupportAgent] = useState(false);
  
  // Use the new comprehensive hook
  const { data: dashboardData, isLoading: dashboardLoading, isFetching: dashboardFetching } = useAdminDashboardData();
  const { data: systemHealth, isLoading: healthLoading, isFetching: healthFetching } = useSystemHealth();
  
  // Fallback stats
  const stats = dashboardData?.stats || { totalUsers: 0, totalEvents: 0, totalVenues: 0, pendingApprovals: 0 };
  const recentUsers = dashboardData?.recentUsers || [];
  const recentEvents = dashboardData?.recentEvents || [];
  const recentRoleRequests = dashboardData?.recentRoleRequests || [];

  const [supportStats, setSupportStats] = useState({
    open: 0,
    inProgress: 0,
    unassigned: 0,
    resolvedThisWeek: 0,
  });
  
  // Minimal role detection solely for support agent specific UI tweaks.
  useEffect(() => {
    let active = true;
    const fetchRoleFlag = async () => {
      try {
        // ✅ SECURITY: Verify user authentication
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return; // layout would have redirected already
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        if (!active) return;
        const roleList = data?.map((r: { role: string }) => r.role) || [];
        setIsSupportAgent(roleList.includes('support_agent'));
      } catch (e) {
        console.warn('Role flag fetch failed (non-fatal):', e);
      }
    };
    fetchRoleFlag();
    return () => { active = false; };
  }, [supabase]);

  // Live updates via storage events - also refresh from Supabase
  useFilteredStorageEvents(['USER_UPDATED','EVENT_SAVED','VENUE_SAVED','ROLE_REQUEST_CREATED','ROLE_REQUEST_UPDATED'], () => {
    // Rely on background revalidation: invalidate stats query for fresh fetch
    // (importing queryClient inline would cause bundle split; simple window event could also be used)
    // TODO: introduce central dispatcher if needed
  }, []);
  
  // Show loading state
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {dashboardLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-8 w-72 bg-gray-200 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-neutral-800 rounded" />
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{isSupportAgent ? 'Support Dashboard' : 'Admin Dashboard'}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isSupportAgent 
                ? 'Focused view of support operations and ticket activity.' 
                : "Welcome back to the Locked admin portal. Here's what's happening on your platform."}
            </p>
          </div>
        )}
        
        {/* Refresh Button */}
        {/* Refresh Button */}
        <RefreshButton 
          onRefresh={async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin'] });
          }}
          isLoading={dashboardLoading || healthLoading || dashboardFetching || healthFetching}
          label="Refresh dashboard data"
          className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
        />
      </div>
      
      <Suspense fallback={<PageLoader message="Loading dashboard metrics..." />}> 
        {dashboardLoading ? <PageLoader message="Loading dashboard metrics..." /> : isSupportAgent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Open Tickets" value={supportStats.open} icon={ClipboardList} change={undefined} linkTo="/admin/support" />
            <MetricCard title="In Progress" value={supportStats.inProgress} icon={Clock} change={undefined} linkTo="/admin/support" />
            <MetricCard title="Unassigned" value={supportStats.unassigned} icon={AlertCircle} change={undefined} linkTo="/admin/support" />
            <MetricCard title="Resolved (7d)" value={supportStats.resolvedThisWeek} icon={CheckCircle} change={undefined} linkTo="/admin/support" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Total Users" value={stats.totalUsers} icon={Users} change={undefined} linkTo="/admin/users" />
            <MetricCard title="Total Events" value={stats.totalEvents} icon={CalendarCheck} change={undefined} linkTo="/admin/events" />
            <MetricCard title="Total Venues" value={stats.totalVenues} icon={Building} change={undefined} linkTo="/admin/venues" />
            <MetricCard title="Pending Approvals" value={stats.pendingApprovals} icon={ClipboardList} change={undefined} linkTo="/admin/role-requests" />
          </div>
        )}
      </Suspense>
      
      {/* Quick Actions (role-based) */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Actions</h2>
        {dashboardLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {Array.from({ length: isSupportAgent ? 2 : 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-lg p-6">
                <div className="h-6 w-1/2 bg-gray-200 dark:bg-neutral-800 rounded mb-3" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : isSupportAgent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAccessCard title="Go to Support Center" description="Manage tickets, knowledge base & responses" icon={ClipboardList} linkTo="/admin/support" color="primary" />
            <QuickAccessCard title="View Activity Log" description="Audit recent platform events" icon={Clock} linkTo="/admin/activity" color="blue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAccessCard title="Review Role Requests" description="Approve or reject pending role requests" icon={Shield} linkTo="/admin/role-requests" color="primary" />
            <QuickAccessCard title="System Settings" description="Manage platform configuration and preferences" icon={Cog} linkTo="/admin/settings" color="blue" />
            <QuickAccessCard title="Database Backup" description="Create a backup of your platform data" icon={Database} linkTo="/admin/settings/backup" color="green" />
            <QuickAccessCard title="View Reports" description="Access platform analytics and reporting" icon={AlertCircle} linkTo="/admin/reports" color="amber" />
          </div>
        )}
      </section>

      {/* Detailed Sections Grid */}
      {!isSupportAgent && !dashboardLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Role Requests */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending Requests</h2>
              <Link href="/admin/role-requests" className="text-sm text-primary hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {recentRoleRequests.length > 0 ? (
                recentRoleRequests.map((req: any) => (
                  <div key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{req.user_name || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500 capitalize">{req.request_type} Request</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No pending requests</div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Users</h2>
              <Link href="/admin/users" className="text-sm text-primary hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {recentUsers.length > 0 ? (
                recentUsers.map((u: any) => (
                  <div key={u.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{u.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent users</div>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Events</h2>
              <Link href="/admin/events" className="text-sm text-primary hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {recentEvents.length > 0 ? (
                recentEvents.map((e: any) => (
                  <div key={e.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <div className="w-10 h-10 rounded bg-gray-200 dark:bg-neutral-800 flex-shrink-0 overflow-hidden">
                       {e.image_url ? (
                        <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
                      ) : (
                        <Calendar className="w-5 h-5 text-gray-500 m-auto h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{e.title}</p>
                      <p className="text-xs text-gray-500 truncate">{new Date(e.start_date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.status === 'published' ? 'bg-green-100 text-green-800' : 
                      e.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {e.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 text-sm">No recent events</div>
              )}
            </div>
          </div>

        </div>
      )}
      
      {/* Improved System Status Section - More compact and informative */}
  {!isSupportAgent && (
    <section>
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Health</h2>
            {!healthLoading && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <Link href="/admin/settings" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">View Details</Link>
        </div>
        <div className="p-6">
          {healthLoading ? <PageLoader message="Loading system health..." /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
               <HealthStatusItem 
                 label="CPU Load Avg (1m)" 
                 value={systemHealth?.metrics?.cpu ? `${systemHealth.metrics.cpu.toFixed(2)}` : systemHealth?.database} 
                 icon={Database} 
                 status={
                    systemHealth?.metrics?.cpu ? (
                        systemHealth.metrics.cpu > 4 ? 'bad' : 
                        systemHealth.metrics.cpu > 2 ? 'warning' : 'good'
                    ) : (systemHealth?.database === 'Operational' ? 'good' : 'bad')
                 } 
               />
               <HealthStatusItem 
                 label="Memory Usage" 
                 value={systemHealth?.metrics?.memory ? `${Math.round(systemHealth.metrics.memory)}%` : systemHealth?.database} // Fallback
                 icon={Server} 
                 status={
                    systemHealth?.metrics?.memory ? (
                        systemHealth.metrics.memory > 90 ? 'bad' : 
                        systemHealth.metrics.memory > 75 ? 'warning' : 'good'
                    ) : 'good'
                 } 
               />
               <HealthStatusItem 
                 label="Storage" 
                 value={systemHealth?.metrics?.storage ? `${Math.round(systemHealth.metrics.storage)}%` : systemHealth?.storage} 
                 icon={HardDrive} 
                 status={systemHealth?.storage === 'Operational' ? 'good' : 'bad'} 
               />
               <HealthStatusItem 
                 label="Active Conn." 
                 value={systemHealth?.metrics?.connections !== null && systemHealth?.metrics?.connections !== undefined ? `${systemHealth.metrics.connections}` : (systemHealth?.api === '100% Uptime' ? 'OK' : '-')} 
                 icon={Globe} 
                 status={
                    systemHealth?.metrics?.connections !== null && systemHealth?.metrics?.connections !== undefined ? (
                        systemHealth.metrics.connections > 90 ? 'bad' : 
                        systemHealth.metrics.connections > 60 ? 'warning' : 'good'
                    ) : 'good'
                 } 
               />
               <HealthStatusItem 
                 label="Latency" 
                 value={systemHealth?.latency} 
                 icon={Activity} 
                 status={parseInt(systemHealth?.latency || '0') < 200 ? 'good' : parseInt(systemHealth?.latency || '0') < 500 ? 'warning' : 'bad'} 
               />
            </div>
          )}
        </div>
      </div>
    </section>
  )}
    </div>
  );
}