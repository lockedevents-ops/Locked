import React from 'react';
import { useOrganizerStore } from '@/store/organizerStore';
import { CheckCircle, Circle } from 'lucide-react';

interface CriterionProps {
  name: string;
  description: string;
  threshold: string;
  isMet: boolean;
  progress?: number;
}

const Criterion: React.FC<CriterionProps> = ({ name, description, threshold, isMet, progress = 0 }) => (
  <div className="border-b border-neutral-200 last:border-0 py-4">
    <div className="flex items-start justify-between mb-2">
      <div>
        <div className="flex items-center gap-2">
          {isMet ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-neutral-300 flex-shrink-0" />
          )}
          <h3 className="font-medium text-neutral-800">{name}</h3>
        </div>
        <p className="text-sm text-neutral-500 mt-1">{description}</p>
      </div>
      <span className={`text-sm font-medium ${isMet ? 'text-green-600' : 'text-neutral-500'}`}>
        {threshold}
      </span>
    </div>
    
    <div className="w-full bg-neutral-100 rounded-full h-2 mt-2">
      <div 
        className={`h-2 rounded-full ${isMet ? 'bg-green-500' : 'bg-blue-500'}`}
        style={{ width: `${Math.min(100, progress)}%` }}
      ></div>
    </div>
  </div>
);

export function QualificationCriteria() {
  const { qualificationMetrics: metrics } = useOrganizerStore();
  
  // Handle null metrics case
  if (!metrics) {
    return (
      <div className="w-full bg-white rounded-xl border border-neutral-200 overflow-hidden p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Premium Qualification</h2>
          <p className="text-neutral-600">Loading qualification metrics...</p>
        </div>
      </div>
    );
  }
  
  const criteria = [
    {
      name: "Events Locked by Users",
      description: "Total number of times users have locked your events",
      threshold: "100 total locks",
      current: metrics.eventsLockedCount,
      isMet: metrics.eventsLockedCount >= 100,
      progress: (metrics.eventsLockedCount / 100) * 100,
    },
    {
      name: "Event Attendance Rate",
      description: "Average percentage of tickets fulfilled across your events",
      threshold: "80% average",
      current: `${metrics.averageTicketFulfillment}%`,
      isMet: metrics.averageTicketFulfillment >= 80,
      progress: metrics.averageTicketFulfillment,
    },
    {
      name: "Event Ratings",
      description: "Average star rating of your events by attendees",
      threshold: "4.5 stars or above",
      current: `${metrics.averageRating} stars`,
      isMet: metrics.averageRating >= 4.5,
      progress: (metrics.averageRating / 5) * 100,
    },
    {
      name: "Feedback Volume",
      description: "Number of verified reviews across all your events",
      threshold: "50+ verified reviews",
      current: `${metrics.reviewCount} reviews`,
      isMet: metrics.reviewCount >= 50,
      progress: (metrics.reviewCount / 50) * 100,
    },
    {
      name: "Repeat Engagement",
      description: "Number of events hosted within the last 90 days",
      threshold: "3 or more events",
      current: `${metrics.eventsHostedLast90Days} events`,
      isMet: metrics.eventsHostedLast90Days >= 3,
      progress: (metrics.eventsHostedLast90Days / 3) * 100,
    }
  ];

  // Count how many criteria are met
  const metCriteriaCount = criteria.filter(criterion => criterion.isMet).length;
  const totalCriteria = criteria.length;
  const progressPercentage = (metCriteriaCount / totalCriteria) * 100;

  return (
    <div className="w-full bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-6 border-b border-neutral-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Premium Qualification</h2>
            <p className="mt-1 text-neutral-600">
              Track your progress toward achieving Premium Organizer status
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{metCriteriaCount}/{totalCriteria}</div>
            <div className="text-sm text-neutral-500">criteria met</div>
          </div>
        </div>
        
        <div className="w-full bg-neutral-100 rounded-full h-2.5 mt-4">
          <div 
            className="h-2.5 rounded-full bg-primary"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="p-6">
        {criteria.map((criterion, index) => (
          <Criterion 
            key={index} 
            name={criterion.name}
            description={criterion.description}
            threshold={criterion.threshold}
            isMet={criterion.isMet}
            progress={criterion.progress}
          />
        ))}
      </div>
      
      <div className="p-6 bg-neutral-50 border-t border-neutral-200">
        <p className="text-sm text-neutral-600">
          Once you meet all criteria, Premium status is automatically granted and maintained as long as you continue to meet these standards. Premium status is reviewed quarterly.
        </p>
      </div>
    </div>
  );
}