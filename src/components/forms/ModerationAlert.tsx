"use client";

import React from 'react';
import { ModerationResult } from '@/services/imageModerationService';
import { AlertTriangle, Shield, Eye, CheckCircle, XCircle } from 'lucide-react';

interface ModerationAlertProps {
  result: ModerationResult;
  fileName?: string;
  onDismiss?: () => void;
  onReview?: () => void;
  showDetails?: boolean;
}

export function ModerationAlert({ 
  result, 
  fileName, 
  onDismiss, 
  onReview, 
  showDetails = true 
}: ModerationAlertProps) {
  const getAlertStyle = () => {
    switch (result.recommendedAction) {
      case 'block':
        return {
          containerClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          textClass: 'text-red-700 dark:text-red-300',
          icon: XCircle
        };
      case 'review':
        return {
          containerClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          textClass: 'text-yellow-700 dark:text-yellow-300',
          icon: Eye
        };
      default:
        return {
          containerClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          textClass: 'text-green-700 dark:text-green-300',
          icon: CheckCircle
        };
    }
  };

  const { containerClass, textClass, icon: Icon } = getAlertStyle();

  const getSeverityBadge = (severity: string) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    
    return badges[severity as keyof typeof badges] || badges.low;
  };

  const getConfidenceText = (confidence: string) => {
    const mapping = {
      'VERY_HIGH': 'Very High',
      'HIGH': 'High',
      'MEDIUM': 'Medium',
      'LOW': 'Low',
      'VERY_LOW': 'Very Low'
    };
    
    return mapping[confidence as keyof typeof mapping] || confidence;
  };

  return (
    <div className={`border rounded-lg p-4 ${containerClass}`}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 mt-0.5 ${textClass}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-medium ${textClass}`}>
              {result.isAppropriate ? 'Content Approved' : 'Content Flagged'}
              {fileName && <span className="font-normal"> - {fileName}</span>}
            </h4>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>

          <div className={`text-sm ${textClass} mb-3`}>
            {result.flagReason || (
              result.isAppropriate 
                ? 'Image passed all content safety checks'
                : 'Image contains potentially inappropriate content'
            )}
          </div>

          {showDetails && (
            <div className="space-y-3">
              {/* Risk Score and Confidence */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Risk Score:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          result.riskScore >= 80 ? 'bg-red-500' :
                          result.riskScore >= 60 ? 'bg-yellow-500' :
                          result.riskScore >= 30 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${result.riskScore}%` }}
                      />
                    </div>
                    <span className={textClass}>{result.riskScore.toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    result.confidence === 'VERY_HIGH' || result.confidence === 'HIGH' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {getConfidenceText(result.confidence)}
                  </span>
                </div>
              </div>

              {/* Detected Labels */}
              {result.detectedLabels.length > 0 && (
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                    Detected Issues:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {result.detectedLabels.map((label, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(label.severity)}`}
                        title={`${label.label}: ${label.confidence.toFixed(1)}% confidence`}
                      >
                        {label.label.replace('_', ' ')} ({label.confidence.toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {result.recommendedAction === 'review' && onReview && (
                  <button
                    onClick={onReview}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Request Manual Review
                  </button>
                )}
                
                {result.recommendedAction === 'block' && (
                  <div className="flex items-center gap-1 text-xs">
                    <Shield className="w-3 h-3 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      Upload blocked for safety
                    </span>
                  </div>
                )}

                {result.isAppropriate && (
                  <div className="flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Safe to upload
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ModerationSummaryProps {
  results: Array<{ file: File; result: ModerationResult }>;
  onClearAll?: () => void;
}

export function ModerationSummary({ results, onClearAll }: ModerationSummaryProps) {
  const approved = results.filter(r => r.result.isAppropriate);
  const flagged = results.filter(r => !r.result.isAppropriate);
  const blocked = results.filter(r => r.result.recommendedAction === 'block');
  const needsReview = results.filter(r => r.result.recommendedAction === 'review');

  if (results.length === 0) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Content Moderation Summary
        </h4>
        
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Approved: <strong className="text-gray-900 dark:text-white">{approved.length}</strong>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Needs Review: <strong className="text-gray-900 dark:text-white">{needsReview.length}</strong>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Blocked: <strong className="text-gray-900 dark:text-white">{blocked.length}</strong>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Total: <strong className="text-gray-900 dark:text-white">{results.length}</strong>
          </span>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {blocked.length > 0 && `${blocked.length} image(s) blocked. `}
            {needsReview.length > 0 && `${needsReview.length} image(s) need manual review.`}
          </p>
        </div>
      )}
    </div>
  );
}
