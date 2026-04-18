"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { Users } from "lucide-react";

export function TeamManagementSection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Load team members on mount
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!user?.id) return;
      
      try {
        // Simulate loading team members
        setTeamMembers([
          {
            id: '1',
            name: 'John Smith',
            email: 'john@example.com',
            role: 'admin',
            permissions: ['events', 'venues', 'analytics', 'team'],
            status: 'active',
            lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
            invitedBy: user.name,
            invitedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            role: 'editor',
            permissions: ['events', 'analytics'],
            status: 'active',
            lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000),
            invitedBy: user.name,
            invitedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
          },
          {
            id: '3',
            name: 'Mike Wilson',
            email: 'mike@example.com',
            role: 'viewer',
            permissions: ['analytics'],
            status: 'pending',
            lastActive: null,
            invitedBy: user.name,
            invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ]);
      } catch (error) {
        console.error('Error loading team members:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTeamMembers();
  }, [user]);

  const updateMemberRole = async (memberId: string, newRole: string, newPermissions: string[]) => {
    setIsSaving(true);
    try {
      const updatedMembers = teamMembers.map(member => 
        member.id === memberId 
          ? { ...member, role: newRole, permissions: newPermissions }
          : member
      );
      setTeamMembers(updatedMembers);
      toast.showSuccess('Role Updated', 'Team member role updated successfully');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update team member role');
    } finally {
      setIsSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    setIsSaving(true);
    try {
      const updatedMembers = teamMembers.filter(member => member.id !== memberId);
      setTeamMembers(updatedMembers);
      toast.showSuccess('Member Removed', 'Team member removed successfully');
    } catch (error) {
      toast.showError('Removal Failed', 'Failed to remove team member');
    } finally {
      setIsSaving(false);
    }
  };

  const resendInvite = async (memberId: string) => {
    setIsSaving(true);
    try {
      // Simulate resending invite
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Invitation Sent', 'Invitation resent successfully');
    } catch (error) {
      toast.showError('Send Failed', 'Failed to resend invitation');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionsByRole = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['events', 'venues', 'analytics', 'team'];
      case 'editor':
        return ['events', 'venues', 'analytics'];
      case 'viewer':
        return ['analytics'];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
        <p className="text-gray-600">Collaborate with your team members efficiently!</p>
      </div>
      
      {/* Friendly Coming Soon Message */}
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Team Collaboration Coming Soon!
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            We're building powerful team collaboration tools that will allow you to invite team members, 
            assign roles and permissions, track activity, and work together seamlessly on events and venues.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-3">
              <strong>What's coming:</strong>
            </p>
            <ul className="text-sm text-green-700 text-left space-y-1">
              <li>• Invite team members via email</li>
              <li>• Role-based permissions (Admin, Editor, Viewer)</li>
              <li>• Activity tracking and notifications</li>
              <li>• Collaborative event management</li>
              <li>• Team communication tools</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* All team management options are hidden for MVP - just show the friendly message */}
    </div>
  );
}
