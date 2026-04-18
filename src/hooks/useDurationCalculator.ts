import { useEffect, useState } from 'react';
import { UseFormWatch } from 'react-hook-form';

/**
 * useDurationCalculator Hook
 * ============================================================================
 * Automatically calculates and formats event duration based on start/end date/time
 * 
 * Features:
 * - Auto-updates when start or end times change
 * - Handles various scenarios (same day, multi-day, no end time, etc.)
 * - Returns formatted human-readable duration
 * - Returns error state if times are invalid
 */

interface FormFields {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  [key: string]: any;
}

interface DurationResult {
  formattedDuration: string;
  hasError: boolean;
  errorMessage?: string;
  details?: {
    days: number;
    hours: number;
    minutes: number;
  };
}

export function useDurationCalculator(watch: UseFormWatch<FormFields>): DurationResult {
  const [durationResult, setDurationResult] = useState<DurationResult>({
    formattedDuration: '',
    hasError: false,
  });

  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const endDate = watch('endDate');
  const endTime = watch('endTime');

  useEffect(() => {
    // If no start date/time, return empty
    if (!startDate || !startTime) {
      setDurationResult({
        formattedDuration: '',
        hasError: false,
      });
      return;
    }

    // If no end date/time, show "Start time only" or similar
    if (!endDate || !endTime) {
      setDurationResult({
        formattedDuration: 'Start time only',
        hasError: false,
      });
      return;
    }

    try {
      // Parse start datetime
      const startDateTime = new Date(`${startDate}T${startTime}`);
      
      // Parse end datetime
      const endDateTime = new Date(`${endDate}T${endTime}`);

      // Validate dates are valid
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setDurationResult({
          formattedDuration: '',
          hasError: true,
          errorMessage: 'Invalid date or time format',
        });
        return;
      }

      // Check if end time is before start time
      if (endDateTime < startDateTime) {
        setDurationResult({
          formattedDuration: '',
          hasError: true,
          errorMessage: 'End time cannot be before start time',
        });
        return;
      }

      // Calculate difference in milliseconds
      const diffMs = endDateTime.getTime() - startDateTime.getTime();

      // Convert to days, hours, minutes
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      // Format the duration string
      let formattedDuration = '';

      if (days > 0) {
        formattedDuration += `${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0 || minutes > 0) {
          formattedDuration += ', ';
        }
      }

      if (hours > 0) {
        formattedDuration += `${hours} hour${hours > 1 ? 's' : ''}`;
        if (minutes > 0) {
          formattedDuration += ', ';
        }
      }

      if (minutes > 0) {
        formattedDuration += `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }

      // Handle edge case: 0 duration (same start and end time)
      if (totalMinutes === 0) {
        formattedDuration = 'Same time event';
      }

      setDurationResult({
        formattedDuration,
        hasError: false,
        details: {
          days,
          hours,
          minutes,
        },
      });
    } catch (error) {
      setDurationResult({
        formattedDuration: '',
        hasError: true,
        errorMessage: 'Error calculating duration',
      });
    }
  }, [startDate, startTime, endDate, endTime]);

  return durationResult;
}
