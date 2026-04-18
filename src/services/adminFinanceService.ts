/**
 * Admin Finance Service
 * Fetches financial data from Supabase for admin monitoring
 */

import { createClient } from '@/lib/supabase/client/client';

export interface PlatformStats {
  totalRevenue: number; // Sum of all ticket sales
  monthlyFees: number; // Platform fees collected (5%)
  pendingPayouts: number; // Count of pending payouts
  totalPayouts: number; // Sum of completed payouts
  growthRate: number; // Month-over-month growth
  feePercentage: number; // Platform fee percentage
}

export interface PayoutRequest {
  id: string;
  organizerId: string;
  organizerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  hubtelReference?: string;
  accountNumber?: string;
  bankCode?: string;
  failureReason?: string;
}

export interface RevenueByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface TopOrganizer {
  id: string;
  name: string;
  email: string;
  eventsCount: number;
  totalRevenue: number;
  platformFees: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  fees: number;
}

class AdminFinanceService {
  private supabase = createClient();

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      // Get current month's revenue from transactions (PAID only)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: currentMonthTx, error: currentError } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID')
        .gte('created_at', startOfMonth.toISOString());

      // Get previous month's revenue for growth calculation
      const startOfPrevMonth = new Date(startOfMonth);
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);

      const { data: prevMonthTx, error: prevError } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID')
        .gte('created_at', startOfPrevMonth.toISOString())
        .lt('created_at', startOfMonth.toISOString());

      // Get all-time totals from transactions
      const { data: allTx, error: allError } = await this.supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID');

      // Get payout statistics
      const { data: payouts, error: payoutError } = await this.supabase
        .from('payout_requests')
        .select('amount, status');

      if (currentError || prevError || allError) {
        console.error('Error fetching platform stats:', { currentError, prevError, allError });
      }

      const currentMonthRevenue = currentMonthTx?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      const prevMonthRevenue = prevMonthTx?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      const totalRevenue = allTx?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      const totalFees = totalRevenue * 0.035; // 3.5% platform fee

      // Payout stats - gracefully handle if table doesn't exist yet
      let pendingPayoutsCount = 0;
      let totalPayoutsAmount = 0;
      
      if (!payoutError && payouts) {
        pendingPayoutsCount = payouts.filter((p: any) => p.status === 'pending').length;
        const completedPayouts = payouts.filter((p: any) => p.status === 'completed');
        totalPayoutsAmount = completedPayouts.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      }

      // Calculate growth rate
      const currentMonthFees = currentMonthRevenue * 0.035;
      const prevMonthFees = prevMonthRevenue * 0.035;
      const growthRate = prevMonthFees > 0
        ? ((currentMonthFees - prevMonthFees) / prevMonthFees) * 100
        : 0;

      return {
        totalRevenue,
        monthlyFees: totalFees,
        pendingPayouts: pendingPayoutsCount,
        totalPayouts: totalPayoutsAmount,
        growthRate,
        feePercentage: 5.0
      };
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      return {
        totalRevenue: 0,
        monthlyFees: 0,
        pendingPayouts: 0,
        totalPayouts: 0,
        growthRate: 0,
        feePercentage: 5.0
      };
    }
  }


  /**
   * Get monthly revenue breakdown for the last 6 months
   */
  async getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await this.supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('status', 'PAID')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching monthly revenue:', error);
        return [];
      }

      // Group by month
      const monthlyData: { [key: string]: { revenue: number; fees: number } } = {};

      data?.forEach((tx: any) => {
        const date = new Date(tx.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, fees: 0 };
        }

        monthlyData[monthKey].revenue += tx.amount || 0;
        monthlyData[monthKey].fees += (tx.amount || 0) * 0.035; // 3.5% fee
      });

      return Object.keys(monthlyData).map(key => {
        const date = new Date(key);
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          revenue: monthlyData[key].revenue,
          fees: monthlyData[key].fees
        };
      });
    } catch (error) {
      console.error('Failed to fetch monthly revenue:', error);
      return [];
    }
  }


  /**
   * Get revenue breakdown by event category
   */
  async getRevenueByCategory(): Promise<RevenueByCategory[]> {
    try {
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select(`
          amount,
          event_id
        `)
        .eq('status', 'PAID');

      if (error) {
        console.error('Error fetching revenue by category:', error);
        return [];
      }

      // Get event IDs
      const eventIds = [...new Set(transactions?.map((t: any) => t.event_id).filter(Boolean))];
      
      if (eventIds.length === 0) {
        return [];
      }

      // Fetch events with categories
      const { data: events, error: eventsError } = await this.supabase
        .from('events')
        .select('id, category')
        .in('id', eventIds);

      if (eventsError) {
        console.error('Error fetching events for categories:', eventsError);
        return [];
      }

      // Create event -> category map
      const eventCategoryMap: { [key: string]: string } = {};
      events?.forEach((e: any) => {
        eventCategoryMap[e.id] = e.category || 'Other';
      });

      // Group by category
      const categoryData: { [key: string]: number } = {};
      let totalRevenue = 0;

      transactions?.forEach((tx: any) => {
        const category = eventCategoryMap[tx.event_id] || 'Other';
        const amount = tx.amount || 0;
        categoryData[category] = (categoryData[category] || 0) + amount;
        totalRevenue += amount;
      });

      return Object.keys(categoryData)
        .map(category => ({
          category,
          amount: categoryData[category],
          percentage: totalRevenue > 0 ? (categoryData[category] / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5); // Top 5 categories
    } catch (error) {
      console.error('Failed to fetch revenue by category:', error);
      return [];
    }
  }


  /**
   * Get top organizers by revenue
   */
  async getTopOrganizers(limit: number = 5): Promise<TopOrganizer[]> {
    try {
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('organizer_id, event_id, amount')
        .eq('status', 'PAID');

      if (error) {
        console.error('Error fetching top organizers:', error);
        return [];
      }

      // Group by organizer
      const organizerData: { [key: string]: { revenue: number; fees: number; events: Set<string> } } = {};

      transactions?.forEach((tx: any) => {
        const organizerId = tx.organizer_id;
        if (!organizerId) return;

        if (!organizerData[organizerId]) {
          organizerData[organizerId] = { revenue: 0, fees: 0, events: new Set() };
        }

        organizerData[organizerId].revenue += tx.amount || 0;
        organizerData[organizerId].fees += (tx.amount || 0) * 0.035;
        if (tx.event_id) {
          organizerData[organizerId].events.add(tx.event_id);
        }
      });

      // Get organizer details
      const organizerIds = Object.keys(organizerData);
      
      if (organizerIds.length === 0) {
        return [];
      }

      const { data: organizers, error: orgError } = await this.supabase
        .from('organizers')
        .select('id, user_id, users(full_name, email)')
        .in('id', organizerIds);

      if (orgError) {
        console.error('Error fetching organizer details:', orgError);
        return [];
      }

      return organizers
        ?.map((org: any) => ({
          id: org.id,
          name: (org as any).users?.full_name || 'Unknown',
          email: (org as any).users?.email || '',
          eventsCount: organizerData[org.id]?.events.size || 0,
          totalRevenue: organizerData[org.id]?.revenue || 0,
          platformFees: organizerData[org.id]?.fees || 0
        }))
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit) || [];
    } catch (error) {
      console.error('Failed to fetch top organizers:', error);
      return [];
    }
  }

  /**
   * Get all payout requests
   */
  async getPayoutRequests(status?: 'pending' | 'processing' | 'completed' | 'failed'): Promise<PayoutRequest[]> {
    try {
      // Simplified query - avoid nested joins that Supabase can't resolve
      let query = this.supabase
        .from('payout_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: payouts, error } = await query;

      if (error) {
        console.error('Error fetching payout requests:', error);
        return [];
      }

      if (!payouts || payouts.length === 0) {
        return [];
      }

      // Get organizer info separately
      const organizerIds = [...new Set(payouts.map((p: any) => p.organizer_id).filter(Boolean))];
      let organizerMap: { [key: string]: string } = {};

      if (organizerIds.length > 0) {
        const { data: organizers } = await this.supabase
          .from('organizers')
          .select('id, user_id')
          .in('id', organizerIds);

        if (organizers && organizers.length > 0) {
          // Get user names
          const userIds = organizers.map((o: any) => o.user_id).filter(Boolean);
          const { data: users } = await this.supabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

          // Build organizer -> name map
          if (users) {
            const userMap: { [key: string]: string } = {};
            users.forEach((u: any) => { userMap[u.id] = u.full_name; });
            organizers.forEach((o: any) => {
              organizerMap[o.id] = userMap[o.user_id] || 'Unknown';
            });
          }
        }
      }

      return payouts.map((payout: any) => ({
        id: payout.id,
        organizerId: payout.organizer_id,
        organizerName: organizerMap[payout.organizer_id] || 'Unknown',
        amount: payout.amount,
        status: payout.status as 'pending' | 'processing' | 'completed' | 'failed',
        requestedAt: payout.requested_at || payout.created_at,
        processedAt: payout.processed_at,
        hubtelReference: payout.hubtel_reference,
        accountNumber: payout.account_number,
        bankCode: payout.bank_code,
        failureReason: payout.failure_reason
      }));
    } catch (error) {
      console.error('Failed to fetch payout requests:', error);
      return [];
    }
  }


  /**
   * Get all transactions (Hubtel payments)
   */
  async getTransactions(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }

  /**
   * Update payout status (called by webhook or admin action)
   */
  async updatePayoutStatus(
    payoutId: string,
    status: 'processing' | 'completed' | 'failed',
    hubtelReference?: string,
    failureReason?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed' || status === 'failed') {
        updates.processed_at = new Date().toISOString();
      }

      if (hubtelReference) {
        updates.hubtel_reference = hubtelReference;
      }

      if (failureReason) {
        updates.failure_reason = failureReason;
      }

      const { error } = await this.supabase
        .from('payout_requests')
        .update(updates)
        .eq('id', payoutId);

      if (error) {
        console.error('Error updating payout status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update payout status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const adminFinanceService = new AdminFinanceService();
