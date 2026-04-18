import { createClient } from '@/lib/supabase/server/server'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone_number: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: string
  granted_by: string | null
  granted_at: string
}

export class SupabaseUserService {
  // List profiles with optional search/pagination
  async listProfiles(opts?: { search?: string; limit?: number; offset?: number }): Promise<UserProfile[]> {
    const supabase = await createClient()
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (opts?.search) {
      query = query.or(`email.ilike.%${opts.search}%,full_name.ilike.%${opts.search}%`)
    }

    if (typeof opts?.limit === 'number') {
      const from = opts.offset || 0
      const to = from + Math.max(0, opts.limit - 1)
      query = query.range(from, to)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error listing profiles:', error)
      return []
    }
    return (data || []) as UserProfile[]
  }

  // Fetch roles for multiple users and return a map user_id -> roles[]
  async getRolesForUsers(userIds: string[]): Promise<Map<string, UserRole[]>> {
    const supabase = await createClient()
    if (!userIds?.length) return new Map()
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .in('user_id', userIds)

    if (error) {
      console.error('Error fetching roles for users:', error)
      return new Map()
    }

    const map = new Map<string, UserRole[]>()
    for (const r of data || []) {
      const list = map.get((r as any).user_id) || []
      list.push(r as UserRole)
      map.set((r as any).user_id, list)
    }
    return map
  }

  // Convenience to list profiles with roles as string[]
  async listProfilesWithRoles(opts?: { search?: string; limit?: number; offset?: number }): Promise<Array<UserProfile & { roles: string[] }>> {
    const profiles = await this.listProfiles(opts)
    const rolesMap = await this.getRolesForUsers(profiles.map(p => p.id))
    return profiles.map(p => ({
      ...p,
      roles: (rolesMap.get(p.id) || []).map(r => r.role)
    }))
  }
  async getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error updating profile:', error)
      return null
    }

    return data
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user roles:', error)
      return []
    }

    return data || []
  }

  async createUserRole(userId: string, role: string, assignedBy?: string): Promise<UserRole | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
  granted_by: assignedBy,
  granted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user role:', error)
      return null
    }

    return data
  }

  async deleteUserRole(userId: string, role: string): Promise<boolean> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role)

    if (error) {
      console.error('Error deleting user role:', error)
      return false
    }

    return true
  }
}

export const supabaseUserService = new SupabaseUserService()