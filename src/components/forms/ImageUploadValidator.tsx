"use client";

import React, { useCallback, useState } from 'react';
import { validateImageSize, getImageSizeError, formatFileSize, MAX_IMAGE_SIZE } from '@/utils/eventValidation';
import { imageModerationService, type ModerationResult } from '@/services/imageModerationService';
import { AlertTriangle, CheckCircle, Upload, Shield, Eye } from 'lucide-react';

interface ImageUploadValidatorProps {
  onValidFile: (file: File, dataUrl: string, moderationResult?: ModerationResult) => void;
  onInvalidFile: (error: string) => void;
  onModerationFlag?: (file: File, moderationResult: ModerationResult) => void;
  contentId?: string;
  userId?: string;
  contentType?: 'event' | 'venue';
  enableModeration?: boolean;
  accept?: string;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ImageUploadValidator({
  onValidFile,
  onInvalidFile,
  onModerationFlag,
  contentId = 'temp_content',
  userId = 'anonymous',
  contentType = 'event',
  enableModeration = true,
  accept = "image/*",
  multiple = false,
  className = "",
  children
}: ImageUploadValidatorProps) {
  const [moderating, setModerating] = useState<Set<string>>(new Set());
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        onInvalidFile(`File "${file.name}" is not an image file`);
        continue;
      }

      // Validate file size
      const sizeError = getImageSizeError(file);
      if (sizeError) {
        onInvalidFile(`${file.name}: ${sizeError}`);
        continue;
      }

      // Start moderation if enabled
      const fileKey = `${file.name}_${file.size}`;
      if (enableModeration) {
        setModerating(prev => new Set(prev).add(fileKey));
      }

      // File is valid, create data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        let moderationResult: ModerationResult | undefined;
        
        // Run content moderation if enabled
        if (enableModeration) {
          try {
            moderationResult = await imageModerationService.moderateImage(
              file,
              contentId,
              userId,
              contentType
            );
            
            // Handle moderation result
            if (!moderationResult.isAppropriate) {
              setModerating(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileKey);
                return newSet;
              });
              
              if (onModerationFlag) {
                onModerationFlag(file, moderationResult);
              }
              
              if (moderationResult.recommendedAction === 'block') {
                onInvalidFile(
                  `${file.name}: Content flagged as inappropriate (${moderationResult.flagReason || 'Automated detection'})`
                );
                return;
              } else if (moderationResult.recommendedAction === 'review') {
                // Allow the file but with a warning
                onInvalidFile(
                  `${file.name}: Flagged for manual review (${moderationResult.flagReason || 'Requires verification'})`
                );
              }
            }
          } catch (error) {
            console.error('Image moderation error:', error);
            // Continue with upload but log the error
          } finally {
            setModerating(prev => {
              const newSet = new Set(prev);
              newSet.delete(fileKey);
              return newSet;
            });
          }
        }
        
        // File passed all checks
        onValidFile(file, dataUrl, moderationResult);
      };
      reader.readAsDataURL(file);
    }

    // Reset input value so the same file can be selected again
    event.target.value = '';
  }, [onValidFile, onInvalidFile, onModerationFlag, contentId, userId, contentType, enableModeration]);

  const isModeratingAny = moderating.size > 0;
  
  const defaultContent = (
    <div className={`border-2 border-dashed ${isModeratingAny ? 'border-blue-300' : 'border-gray-300'} dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors`}>
      {isModeratingAny ? (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
            Scanning image for inappropriate content...
          </p>
        </>
      ) : (
        <>
          <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {multiple ? 'Choose images or drag and drop' : 'Choose an image or drag and drop'}
          </p>
        </>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        PNG, JPG, GIF up to {formatFileSize(MAX_IMAGE_SIZE)}
        {enableModeration && (
          <span className="flex items-center justify-center gap-1 mt-1">
            <Shield className="w-3 h-3" />
            Protected by AI content screening
          </span>
        )}
      </p>
    </div>
  );

  return (
    <div className={className}>
      <label className="block cursor-pointer">
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="sr-only"
        />
        {children || defaultContent}
      </label>
    </div>
  );
}

interface ValidationMessageProps {
  message: string;
  type: 'success' | 'error';
}

export function ValidationMessage({ message, type }: ValidationMessageProps) {
  const isError = type === 'error';
  
  return (
    <div className={`flex items-center gap-2 p-3 rounded-md ${
      isError 
        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    }`}>
      {isError ? (
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      ) : (
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

interface FilePreviewProps {
  file: File;
  dataUrl: string;
  onRemove?: () => void;
}

export function FilePreview({ file, dataUrl, onRemove }: FilePreviewProps) {
  return (
    <div className="relative inline-block">
      <img
        src={dataUrl}
        alt={file.name}
        className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-20">
        {file.name}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {formatFileSize(file.size)}
      </p>
    </div>
  );
}
