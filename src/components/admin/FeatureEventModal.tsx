/**
 * Feature Event Modal Component
 * --------------------------------------------------------------
 * Modal for admins to manually feature events with duration options
 */

import { useState, useRef, useEffect } from 'react';
import { Star, Calendar, DollarSign, TrendingUp } from 'lucide-react';

interface FeatureEventModalProps {
  eventTitle: string;
  currentFeaturedType?: 'auto' | 'manual' | 'none';
  isCurrentlyFeatured: boolean;
  onConfirm: (feature: boolean, durationDays?: number) => void;
  onCancel: () => void;
}

export const FeatureEventModal = ({
  eventTitle,
  currentFeaturedType = 'none',
  isCurrentlyFeatured,
  onConfirm,
  onCancel
}: FeatureEventModalProps) => {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  
  const durationOptions = [
    { days: 1, label: '1 Day', price: '$5' },
    { days: 3, label: '3 Days', price: '$12' },
    { days: 7, label: '1 Week', price: '$25' },
    { days: 14, label: '2 Weeks', price: '$45' },
    { days: 30, label: '1 Month', price: '$80' },
  ];

  // Handle escape key to cancel
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onCancel]);

  const handleConfirm = () => {
    if (isCurrentlyFeatured) {
      // Unfeaturing
      onConfirm(false);
    } else {
      // Featuring
      const duration = selectedDuration === -1 
        ? parseInt(customDuration) || undefined
        : selectedDuration || undefined;
      onConfirm(true, duration);
    }
  };

  const getFeatureTypeInfo = () => {
    switch (currentFeaturedType) {
      case 'auto':
        return {
          icon: <TrendingUp className="w-5 h-5 text-blue-500" />,
          label: 'Auto-Featured (Trending)',
          description: 'This event is featured based on engagement metrics'
        };
      case 'manual':
        return {
          icon: <Star className="w-5 h-5 text-amber-500" />,
          label: 'Manually Featured (Promoted)',
          description: 'This event is manually featured as a paid promotion'
        };
      default:
        return {
          icon: <Star className="w-5 h-5 text-gray-400" />,
          label: 'Not Featured',
          description: 'This event is not currently featured'
        };
    }
  };

  const featureInfo = getFeatureTypeInfo();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onCancel(); }}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex items-start gap-3">
            {featureInfo.icon}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isCurrentlyFeatured ? 'Unfeature Event' : 'Feature Event'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {eventTitle}
              </p>
            </div>
          </div>
          
          {/* Current Status */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-center gap-2">
              {featureInfo.icon}
              <span className="font-medium text-sm">{featureInfo.label}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {featureInfo.description}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isCurrentlyFeatured ? (
            // Unfeature confirmation
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Remove from Featured?</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                This event will no longer appear in the featured section and lose its promoted status.
                {currentFeaturedType === 'auto' && ' It may be re-featured automatically if it continues to perform well.'}
              </p>
            </div>
          ) : (
            // Feature options
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">Paid Promotion Duration</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Select how long this event should be featured as a paid promotion. Featured events appear prominently on the homepage.
              </p>

              {/* Duration Options */}
              <div className="space-y-2 mb-4">
                {durationOptions.map((option) => (
                  <label
                    key={option.days}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDuration === option.days
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="duration"
                        value={option.days}
                        checked={selectedDuration === option.days}
                        onChange={() => setSelectedDuration(option.days)}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.days} day{option.days > 1 ? 's' : ''} of promotion</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">{option.price}</div>
                  </label>
                ))}
                
                {/* Indefinite option */}
                <label
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDuration === null
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="duration"
                      value="indefinite"
                      checked={selectedDuration === null}
                      onChange={() => setSelectedDuration(null)}
                      className="text-purple-600"
                    />
                    <div>
                      <div className="font-medium">Indefinite</div>
                      <div className="text-sm text-gray-500">Feature until manually removed</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-purple-600">Free</div>
                </label>

                {/* Custom duration option */}
                <label
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDuration === -1
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="radio"
                      name="duration"
                      value="custom"
                      checked={selectedDuration === -1}
                      onChange={() => setSelectedDuration(-1)}
                      className="text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Custom Duration</div>
                      <input
                        type="number"
                        placeholder="Enter days"
                        value={customDuration}
                        onChange={(e) => {
                          setCustomDuration(e.target.value);
                          if (e.target.value) setSelectedDuration(-1);
                        }}
                        className="mt-1 w-24 px-2 py-1 border border-gray-300 dark:border-neutral-600 rounded text-sm"
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Custom rate</div>
                </label>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  <strong>Note:</strong> Manual promotions take priority over auto-featured events. 
                  This event will be featured regardless of its engagement metrics.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-neutral-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 dark:border-neutral-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isCurrentlyFeatured
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isCurrentlyFeatured ? 'Remove Featured Status' : 'Feature Event'}
          </button>
        </div>
      </div>
    </div>
  );
};
