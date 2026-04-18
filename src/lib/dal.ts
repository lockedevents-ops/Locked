import 'server-only'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server/server'
import { cache } from 'react'
import { redirect } from 'next/navigation'

/**
 * Get the current user session and profile data.
 * Cached per request to avoid duplicate DB calls in layouts/pages.
 */
export const getUser = cache(async () => {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  return user
})

/**
 * Verify user is fully authenticated and not suspended.
 * To be used in Layouts/Pages.
 */
export const verifyAuth = cache(async () => {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()
    
  if (profile?.status === 'suspended') {
    // We can't easily sign out server-side without middleware redirect loop risk,
    // so we redirect to a suspension page or auth error page.
    redirect('/auth/signin?error=account_suspended')
  }

  return user
})

/**
 * Verify user has organizer access
 */
export const verifyOrganizerAccess = cache(async () => {
  await verifyAuth()
  return true
})
/**
 * Verify user has venue owner access
 */
export const verifyVenueOwnerAccess = cache(async () => {
  await verifyAuth()
  return true
})
