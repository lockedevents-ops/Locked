import React from 'react';
import { useToast } from '@/hooks/useToast';

export function AdminToastDemo() {
  const { showSuccess, showError, showWarning, showInfo, showToast, dismissAll } = useToast();

  const handleTestSuccess = () => {
    showSuccess(
      'Operation Successful',
      'Your changes have been saved successfully and are now live.'
    );
  };

  const handleTestError = () => {
    showError(
      'Operation Failed',
      'Unable to complete the request. Please check your connection and try again.'
    );
  };

  const handleTestWarning = () => {
    showWarning(
      'Warning: Data Limit Approaching',
      'You are approaching your monthly data limit. Consider upgrading your plan.'
    );
  };

  const handleTestInfo = () => {
    showInfo(
      'System Maintenance',
      'Scheduled maintenance will occur tonight from 2:00 AM - 4:00 AM EST.'
    );
  };

  const handleTestCustom = () => {
    showToast({
      type: 'default',
      title: 'Custom Notification',
      description: 'This is a custom toast with default styling.',
      duration: 5000,
    });
  };

  const handleTestLongDuration = () => {
    showSuccess(
      'Long Duration Toast',
      'This toast will stay visible for 10 seconds.',
      10000
    );
  };

  const handleTestNoDescription = () => {
    showInfo('Simple Notification');
  };

  const handleTestMultiple = () => {
    showSuccess('First toast', 'This is the first toast');
    setTimeout(() => showWarning('Second toast', 'This is the second toast'), 500);
    setTimeout(() => showInfo('Third toast', 'This is the third toast'), 1000);
  };

  return (
    <div className="p-6 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Admin Toast System Demo
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Test the custom admin notification system with different toast types and configurations.
      </p>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={handleTestSuccess}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Success Toast
        </button>
        
        <button
          onClick={handleTestError}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Error Toast
        </button>
        
        <button
          onClick={handleTestWarning}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Warning Toast
        </button>
        
        <button
          onClick={handleTestInfo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Info Toast
        </button>
        
        <button
          onClick={handleTestCustom}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Custom Toast
        </button>
        
        <button
          onClick={handleTestLongDuration}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Long Duration
        </button>
        
        <button
          onClick={handleTestNoDescription}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          No Description
        </button>
        
        <button
          onClick={handleTestMultiple}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Multiple Toasts
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800">
        <button
          onClick={dismissAll}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          Dismiss All Toasts
        </button>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>• Toasts auto-dismiss after 3 seconds (configurable)</p>
        <p>• Hover to pause auto-dismiss</p>
        <p>• Click X button to manually dismiss</p>
        <p>• Supports dark theme automatically</p>
        <p>• Smooth animations with Framer Motion</p>
      </div>
    </div>
  );
}
