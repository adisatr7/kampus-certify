// hooks/useDashboardData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  totalDocuments: number;
  signedDocuments: number;
  pendingDocuments: number;
  totalUsers: number;
  adminUsers: number;
  staffUsers: number;
  todayVerifications: number;
  validVerifications: number;
  invalidVerifications: number;
}

export interface RecentActivity {
  id: string;
  type: 'certificate' | 'document' | 'verification' | 'revoke';
  title: string;
  description: string;
  time: string;
  status: 'valid' | 'revoked' | 'pending';
  user_name?: string;
  created_at: string;
}

export interface RecentDocument {
  id: string;
  title: string;
  status: 'pending' | 'signed' | 'revoked';
  created_at: string;
  signed_at?: string;
}

// Hook for fetching dashboard statistics
export const useDashboardStats = (userRole: string) => {
  return useQuery({
    queryKey: ['dashboard-stats', userRole],
    queryFn: async (): Promise<DashboardStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let stats: DashboardStats = {
        totalCertificates: 0,
        activeCertificates: 0,
        revokedCertificates: 0,
        totalDocuments: 0,
        signedDocuments: 0,
        pendingDocuments: 0,
        totalUsers: 0,
        adminUsers: 0,
        staffUsers: 0,
        todayVerifications: 0,
        validVerifications: 0,
        invalidVerifications: 0,
      };

      try {
        // Fetch certificates data
        const certificatesQuery = userRole === 'admin' 
          ? supabase.from('certificates').select('status, user_id')
          : supabase.from('certificates').select('status, user_id').eq('user_id', user.id);
        
        const { data: certificates } = await certificatesQuery;
        
        if (certificates) {
          stats.totalCertificates = certificates.length;
          stats.activeCertificates = certificates.filter(c => c.status === 'active').length;
          stats.revokedCertificates = certificates.filter(c => c.status === 'revoked').length;
        }

        // Fetch documents data
        const documentsQuery = userRole === 'admin'
          ? supabase.from('documents').select('status, signed_at, user_id')
          : supabase.from('documents').select('status, signed_at, user_id').eq('user_id', user.id);
        
        const { data: documents } = await documentsQuery;
        
        if (documents) {
          stats.totalDocuments = documents.length;
          stats.signedDocuments = documents.filter(d => d.signed_at !== null).length;
          stats.pendingDocuments = documents.filter(d => d.status === 'pending').length;
        }

        // Fetch users data (only for admin)
        if (userRole === 'admin') {
          const { data: users } = await supabase
            .from('users')
            .select('role');
          
          if (users) {
            stats.totalUsers = users.length;
            stats.adminUsers = users.filter(u => u.role === 'admin').length;
            stats.staffUsers = users.filter(u => u.role !== 'admin').length;
          }

          // Fetch today's audit trail for verifications
          const today = new Date().toISOString().split('T')[0];
          const { data: auditData } = await supabase
            .from('audit_trail')
            .select('action, description')
            .gte('timestamp', `${today}T00:00:00.000Z`)
            .lt('timestamp', `${today}T23:59:59.999Z`)
            .ilike('action', '%verification%');

          if (auditData) {
            stats.todayVerifications = auditData.length;
            stats.validVerifications = auditData.filter(a => 
              a.description?.toLowerCase().includes('valid') || 
              a.description?.toLowerCase().includes('berhasil')
            ).length;
            stats.invalidVerifications = stats.todayVerifications - stats.validVerifications;
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Hook for fetching recent activities (admin only)
export const useRecentActivities = (userRole?: string) => {
  return useQuery({
    queryKey: ['recent-activities', userRole],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (userRole !== 'admin') return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch recent audit trail entries with user information
      const { data: auditData, error } = await supabase
        .from('audit_trail')
        .select(`
          id,
          action,
          description,
          timestamp
        `)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching activities:', error);
        return [];
      }

      // Get user IDs from audit data
      const userIds = [...new Set(auditData?.map(item => item.id).filter(Boolean) || [])];
      
      // Fetch user data separately
      const { data: userData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      const userMap = new Map(userData?.map(user => [user.id, user]) || []);

      // Transform audit data to activity format
      const activities: RecentActivity[] = (auditData || []).map(item => {
        const activity = item as any;
        let type: RecentActivity['type'] = 'verification';
        let status: RecentActivity['status'] = 'valid';
        let title = activity.action || 'Unknown Action';
        let description = activity.description || '';

        // Determine activity type and status based on action
        if (activity.action?.toLowerCase().includes('certificate')) {
          type = 'certificate';
          if (activity.action?.toLowerCase().includes('revoke')) {
            type = 'revoke';
            status = 'revoked';
          }
        } else if (activity.action?.toLowerCase().includes('document')) {
          type = 'document';
          if (activity.action?.toLowerCase().includes('sign')) {
            status = 'valid';
          }
        } else if (activity.action?.toLowerCase().includes('verification')) {
          type = 'verification';
          status = description.toLowerCase().includes('invalid') ? 'revoked' : 'valid';
        }

        // Calculate time ago
        const createdAt = new Date(activity.timestamp);
        const now = new Date();
        const diffInMs = now.getTime() - createdAt.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        let timeAgo: string;
        if (diffInDays > 0) {
          timeAgo = `${diffInDays} hari yang lalu`;
        } else if (diffInHours > 0) {
          timeAgo = `${diffInHours} jam yang lalu`;
        } else {
          const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
          timeAgo = diffInMinutes > 0 ? `${diffInMinutes} menit yang lalu` : 'Baru saja';
        }

        const user = userMap.get(activity.user_id);

        return {
          id: activity.id,
          type,
          title,
          description,
          time: timeAgo,
          status,
          user_name: user?.name,
          created_at: activity.timestamp,
        };
      });

      return activities;
    },
    enabled: userRole === 'admin',
    refetchInterval: 60000, // Refresh every minute
  });
};

// Hook for fetching recent documents (non-admin users)
export const useRecentDocuments = (userRole: string) => {
  return useQuery({
    queryKey: ['recent-documents', userRole],
    queryFn: async (): Promise<RecentDocument[]> => {
      if (userRole === 'admin') return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, title, status, created_at, signed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent documents:', error);
        return [];
      }

      return documents?.map(doc => ({
        id: doc.id,
        title: doc.title,
        status: doc.status as 'pending' | 'signed' | 'revoked',
        created_at: doc.created_at,
        signed_at: doc.signed_at,
      })) || [];
    },
    enabled: userRole !== 'admin',
    refetchInterval: 60000,
  });
};