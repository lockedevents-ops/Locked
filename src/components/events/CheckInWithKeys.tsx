import { useState, useEffect } from 'react';
import { useKeysStore } from '@/store/keysStore';
import { useToast } from '@/hooks/useToast';
import { KeysNotification } from '@/components/keys/KeysNotification';
import { attendeeService } from '@/services/attendeeService';
import { createClient } from '@/lib/supabase/client/client';

interface CheckInWithKeysProps {
  eventId: string;
  eventName: string;
  registrationId?: string; // Optional registration ID for updating check-in status
}

export function CheckInWithKeys({ eventId, eventName, registrationId }: CheckInWithKeysProps) {
  const { addKeys, updateStreak } = useKeysStore();
  const toast = useToast();
  const [showKeysNotification, setShowKeysNotification] = useState(false);
  const [earnedKeys, setEarnedKeys] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userRegistrationId, setUserRegistrationId] = useState<string | null>(registrationId || null);
  
  // Check if user has a registration for this event and if already checked in
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (registrationId) return; // Already have registration ID
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Find user's registration for this event
      const { data: registration } = await supabase
        .from('event_registrations')
        .select('id, status, checked_in_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();
        
      if (registration) {
        setUserRegistrationId(registration.id);
        if (registration.status === 'checked_in' || registration.checked_in_at) {
          setIsCheckedIn(true);
        }
      }
    };
    
    checkRegistrationStatus();
  }, [eventId, registrationId]);
  
  const handleCheckIn = async () => {
    setIsLoading(true);
    
    try {
      // Update check-in status in database if we have a registration
      if (userRegistrationId) {
        const success = await attendeeService.updateAttendeeCheckIn(userRegistrationId, true);
        if (!success) {
          toast.showError('Check-In Failed', 'Could not update check-in status. Please try again.');
          setIsLoading(false);
          return;
        }
      }
      
      // Base KEYS for attending
      let keysToAdd = 50;
      
      // Update streak and potentially add bonus
      updateStreak(new Date().toISOString());
      
      // Simulate streak bonus
      const { streaks } = useKeysStore.getState();
      if (streaks && streaks.eventAttendance >= 3) {
        keysToAdd += 25; // Bonus for maintaining streak
      }
      
      // Add KEYS and show notification
      addKeys(keysToAdd, `Checked in to ${eventName}`, eventId);
      
      setEarnedKeys(keysToAdd);
      setShowKeysNotification(true);
      setIsCheckedIn(true);
      
      toast.showSuccess('Check-In Complete', 'Successfully checked in!');
    } catch (error) {
      console.error('Check-in error:', error);
      toast.showError('Check-In Failed', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isCheckedIn) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
        <div className="bg-green-100 p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-medium">You're checked in!</p>
          <p className="text-sm text-green-700">You earned {earnedKeys} KEYS</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-bold">Check In & Earn KEYS</h3>
        <p className="text-neutral-600">
          Check in to this event to confirm your attendance and earn KEYS you can redeem for exclusive rewards.
        </p>
        
        <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="bg-primary/10 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Earn 50 KEYS</p>
            <p className="text-sm text-neutral-600">By checking in to this event</p>
          </div>
        </div>
        
        <button
          onClick={handleCheckIn}
          disabled={isLoading}
          className="w-full bg-primary text-white py-3 rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking In...' : 'Check In Now'}
        </button>
      </div>
      
      {showKeysNotification && (
        <KeysNotification
          amount={earnedKeys}
          message={`For checking in to ${eventName}`}
          onClose={() => setShowKeysNotification(false)}
        />
      )}
    </>
  );
}