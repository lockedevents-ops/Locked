/**
 * Image Moderation Service
 * --------------------------------------------------------------
 * Detects inappropriate visual content including nude images, violence,
 * and other policy violations using AI-powered image analysis.
 * Integrates with cloud vision APIs and fallback detection methods.
 */

import { createClient } from '@/lib/supabase/client/client';
import { flaggedContentService } from './flaggedContentService';
import { userOffenseService } from './userOffenseService';
import { googleVisionService } from './googleVisionService';

export type ModerationLabel = 
  | 'nude' 
  | 'sexual' 
  | 'violence' 
  | 'drugs' 
  | 'weapons' 
  | 'hate_symbols' 
  | 'inappropriate_text'
  | 'fake_content'
  | 'spam';

export type ConfidenceLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface ModerationResult {
  isAppropriate: boolean;
  confidence: ConfidenceLevel;
  detectedLabels: {
    label: ModerationLabel;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  riskScore: number; // 0-100
  flagReason?: string;
  recommendedAction: 'allow' | 'review' | 'block';
}

export interface ImageModerationConfig {
  enableCloudModeration: boolean;
  cloudProvider: 'google' | 'aws' | 'azure' | 'multiple';
  confidenceThreshold: number; // 0-100
  blockThreshold: number; // 0-100
  reviewThreshold: number; // 0-100
  enableHashComparison: boolean;
  enableMetadataAnalysis: boolean;
  enableFaceDetection: boolean;
}

const DEFAULT_CONFIG: ImageModerationConfig = {
  enableCloudModeration: true,
  cloudProvider: 'google', // Start with Google Vision API
  confidenceThreshold: 75,
  blockThreshold: 85,
  reviewThreshold: 60,
  enableHashComparison: true,
  enableMetadataAnalysis: true,
  enableFaceDetection: true
};

// Known inappropriate image hashes (for quick blocking of known bad content)
const BLOCKED_IMAGE_HASHES = new Set<string>();

// Suspicious file patterns
const SUSPICIOUS_PATTERNS = {
  filenames: [
    /^(nude|naked|sex|porn|xxx|adult)/i,
    /\.(adult|xxx|sex)$/i,
    /(onlyfans|nsfw|r18|18\+)/i
  ],
  metadata: {
    suspiciousKeywords: ['nude', 'naked', 'adult', 'nsfw', 'sex', 'porn', 'xxx']
  }
};

export const imageModerationService = {

  /**
   * Moderate image content using multiple detection methods
   */
  async moderateImage(
    imageFile: File | Buffer,
    contentId: string,
    userId: string,
    contentType: 'event' | 'venue' = 'event',
    config: Partial<ImageModerationConfig> = {}
  ): Promise<ModerationResult> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    try {
      let imageBuffer: Buffer;
      let filename = '';
      
      if (imageFile instanceof File) {
        imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        filename = imageFile.name;
      } else {
        imageBuffer = imageFile;
      }

      // Quick hash check for known bad content
      const imageHash = await this.calculateImageHash(imageBuffer);
      if (BLOCKED_IMAGE_HASHES.has(imageHash)) {
        return {
          isAppropriate: false,
          confidence: 'VERY_HIGH',
          detectedLabels: [{
            label: 'inappropriate_text',
            confidence: 100,
            severity: 'critical'
          }],
          riskScore: 100,
          flagReason: 'Matches known inappropriate content hash',
          recommendedAction: 'block'
        };
      }

      // Run multiple detection methods
      const results = await Promise.allSettled([
        finalConfig.enableCloudModeration ? this.cloudModeration(imageBuffer, finalConfig) : null,
        finalConfig.enableMetadataAnalysis ? this.analyzeMetadata(filename, imageBuffer) : null,
        finalConfig.enableHashComparison ? this.compareWithKnownContent(imageHash, userId) : null,
        this.analyzeImageStructure(imageBuffer) // Basic image analysis
      ]);

      // Combine results
      return this.combineResults(results, finalConfig, imageHash);

    } catch (error) {
      console.error('Error in image moderation:', error);
      
      // Fallback to safe approach - flag for manual review
      return {
        isAppropriate: false,
        confidence: 'LOW',
        detectedLabels: [],
        riskScore: 50,
        flagReason: 'Error during automated analysis, requires manual review',
        recommendedAction: 'review'
      };
    }
  },

  /**
   * Cloud-based AI moderation
   */
  async cloudModeration(imageBuffer: Buffer, config: ImageModerationConfig): Promise<Partial<ModerationResult>> {
    switch (config.cloudProvider) {
      case 'google':
        return this.googleVisionModeration(imageBuffer, config);
      case 'aws':
        return this.awsRekognitionModeration(imageBuffer, config);
      case 'azure':
        return this.azureModeration(imageBuffer, config);
      case 'multiple':
        // Run multiple providers and combine results
        const [google, aws, azure] = await Promise.allSettled([
          this.googleVisionModeration(imageBuffer, config),
          this.awsRekognitionModeration(imageBuffer, config),
          this.azureModeration(imageBuffer, config)
        ]);
        return this.combineMultipleProviderResults([google, aws, azure]);
      default:
        return this.googleVisionModeration(imageBuffer, config);
    }
  },

  /**
   * Google Cloud Vision API moderation
   */
  async googleVisionModeration(imageBuffer: Buffer, config: ImageModerationConfig): Promise<Partial<ModerationResult>> {
    try {
      // Use real Google Vision API service
      const result = await googleVisionService.analyzeImage(imageBuffer, config);
      return result;
    } catch (error) {
      console.error('Google Vision API error:', error);
      
      // Fallback to safe approach
      return {
        riskScore: 50,
        confidence: 'LOW',
        flagReason: 'Google Vision API unavailable, manual review recommended',
        detectedLabels: []
      };
    }
  },

  /**
   * AWS Rekognition moderation (mock implementation)
   */
  async awsRekognitionModeration(imageBuffer: Buffer, config: ImageModerationConfig): Promise<Partial<ModerationResult>> {
    // Mock implementation - replace with actual AWS SDK calls
    const mockLabels = [
      { Name: 'Explicit Nudity', Confidence: Math.random() * 100, ParentName: '' },
      { Name: 'Suggestive', Confidence: Math.random() * 100, ParentName: '' },
      { Name: 'Violence', Confidence: Math.random() * 100, ParentName: '' }
    ];

    const detectedLabels = this.parseAWSResults(mockLabels, config.confidenceThreshold);
    const riskScore = this.calculateRiskScore(detectedLabels);

    return {
      detectedLabels,
      riskScore,
      confidence: riskScore > 85 ? 'VERY_HIGH' : riskScore > 70 ? 'HIGH' : 'MEDIUM'
    };
  },

  /**
   * Azure Content Moderator (mock implementation)
   */
  async azureModeration(imageBuffer: Buffer, config: ImageModerationConfig): Promise<Partial<ModerationResult>> {
    // Mock implementation - replace with actual Azure API calls
    const mockResult = {
      IsImageAdultClassified: Math.random() > 0.8,
      AdultClassificationScore: Math.random(),
      IsImageRacyClassified: Math.random() > 0.7,
      RacyClassificationScore: Math.random()
    };

    const detectedLabels = this.parseAzureResults(mockResult);
    const riskScore = this.calculateRiskScore(detectedLabels);

    return {
      detectedLabels,
      riskScore,
      confidence: riskScore > 80 ? 'VERY_HIGH' : riskScore > 60 ? 'HIGH' : 'MEDIUM'
    };
  },

  /**
   * Analyze image metadata and filename
   */
  async analyzeMetadata(filename: string, imageBuffer: Buffer): Promise<Partial<ModerationResult>> {
    const detectedLabels: ModerationResult['detectedLabels'] = [];
    let riskScore = 0;

    // Check filename patterns
    for (const pattern of SUSPICIOUS_PATTERNS.filenames) {
      if (pattern.test(filename)) {
        detectedLabels.push({
          label: 'inappropriate_text',
          confidence: 85,
          severity: 'high'
        });
        riskScore += 30;
        break;
      }
    }

    // Basic EXIF data analysis (if available)
    // Note: In a real implementation, you'd use an EXIF library
    const hasExif = this.hasExifData(imageBuffer);
    if (hasExif && this.hasSuspiciousExifData(imageBuffer)) {
      detectedLabels.push({
        label: 'inappropriate_text',
        confidence: 70,
        severity: 'medium'
      });
      riskScore += 20;
    }

    return {
      detectedLabels,
      riskScore: Math.min(riskScore, 100),
      confidence: riskScore > 50 ? 'HIGH' : 'MEDIUM'
    };
  },

  /**
   * Compare with known inappropriate content hashes
   */
  async compareWithKnownContent(imageHash: string, userId: string): Promise<Partial<ModerationResult>> {
    // Check against user's previous flagged content
    const userOffenses = await userOffenseService.getUserOffenseRecord(userId, 'inappropriate');
    
    if (userOffenses && userOffenses.content_hash === imageHash) {
      return {
        detectedLabels: [{
          label: 'inappropriate_text',
          confidence: 95,
          severity: 'critical'
        }],
        riskScore: 95,
        confidence: 'VERY_HIGH',
        flagReason: 'Matches previous flagged content from same user'
      };
    }

    return { riskScore: 0, confidence: 'LOW' };
  },

  /**
   * Basic image structure analysis
   */
  async analyzeImageStructure(imageBuffer: Buffer): Promise<Partial<ModerationResult>> {
    let riskScore = 0;
    const detectedLabels: ModerationResult['detectedLabels'] = [];

    // Check image size patterns (very large or very small images can be suspicious)
    const imageSize = imageBuffer.length;
    if (imageSize < 1024) { // Very small images (< 1KB)
      riskScore += 10;
    } else if (imageSize > 10 * 1024 * 1024) { // Very large images (> 10MB)
      riskScore += 15;
    }

    // Basic file header analysis
    const header = imageBuffer.slice(0, 10);
    if (this.hasSuspiciousHeader(header)) {
      detectedLabels.push({
        label: 'fake_content',
        confidence: 60,
        severity: 'medium'
      });
      riskScore += 25;
    }

    return {
      detectedLabels,
      riskScore: Math.min(riskScore, 100),
      confidence: riskScore > 30 ? 'MEDIUM' : 'LOW'
    };
  },

  /**
   * Combine results from multiple detection methods
   */
  combineResults(results: PromiseSettledResult<any>[], config: ImageModerationConfig, imageHash: string): ModerationResult {
    let totalRiskScore = 0;
    let allDetectedLabels: ModerationResult['detectedLabels'] = [];
    let highestConfidence: ConfidenceLevel = 'LOW';
    let flagReasons: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const value = result.value;
        if (value.riskScore) totalRiskScore += value.riskScore;
        if (value.detectedLabels) allDetectedLabels.push(...value.detectedLabels);
        if (value.flagReason) flagReasons.push(value.flagReason);
        if (this.compareConfidence(value.confidence, highestConfidence) > 0) {
          highestConfidence = value.confidence;
        }
      }
    });

    // Average the risk scores
    const finalRiskScore = Math.min(totalRiskScore / results.length, 100);
    
    // Determine recommended action
    let recommendedAction: ModerationResult['recommendedAction'] = 'allow';
    if (finalRiskScore >= config.blockThreshold) {
      recommendedAction = 'block';
    } else if (finalRiskScore >= config.reviewThreshold) {
      recommendedAction = 'review';
    }

    // Determine if content is appropriate
    const isAppropriate = recommendedAction === 'allow';

    return {
      isAppropriate,
      confidence: highestConfidence,
      detectedLabels: allDetectedLabels,
      riskScore: finalRiskScore,
      flagReason: flagReasons.length > 0 ? flagReasons.join('; ') : undefined,
      recommendedAction
    };
  },

  /**
   * Handle post-moderation actions
   */
  async handleModerationResult(
    moderationResult: ModerationResult,
    contentId: string,
    userId: string,
    contentType: 'event' | 'venue',
    imageHash: string
  ): Promise<void> {
    if (!moderationResult.isAppropriate) {
      // Flag the content
      const flagReason = moderationResult.detectedLabels.length > 0 
        ? 'inappropriate_content' 
        : 'automated_detection';

      const severity = this.determineSeverity(moderationResult.detectedLabels);
      
      await flaggedContentService.flagContent(
        contentType,
        contentId,
        flagReason,
        'system', // Automated flagging
        undefined, // No specific policy rule ID for AI detection
        moderationResult.flagReason || 'AI-detected inappropriate visual content',
        true // Auto-flagged
      );

      // Record user offense if it's a serious violation
      if (moderationResult.riskScore >= 70) {
        await userOffenseService.recordOffense(
          userId,
          'inappropriate',
          contentType,
          contentId,
          moderationResult.flagReason || 'Inappropriate visual content detected',
          severity,
          `Image hash: ${imageHash}`,
          undefined, // No flagged item ID yet
          'system' // System admin ID
        );
      }

      // Add to blocked hashes if it's very high confidence
      if (moderationResult.confidence === 'VERY_HIGH' && moderationResult.riskScore >= 90) {
        BLOCKED_IMAGE_HASHES.add(imageHash);
      }
    }
  },

  /**
   * Utility functions
   */
  
  async calculateImageHash(imageBuffer: Buffer): Promise<string> {
    // Simple hash calculation - in production, use perceptual hashing
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  },

  parseGoogleResults(safeSearch: any): ModerationResult['detectedLabels'] {
    const labels: ModerationResult['detectedLabels'] = [];
    
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      labels.push({ label: 'nude', confidence: 85, severity: 'critical' });
    }
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      labels.push({ label: 'sexual', confidence: 80, severity: 'high' });
    }
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      labels.push({ label: 'violence', confidence: 85, severity: 'high' });
    }

    return labels;
  },

  parseAWSResults(labels: any[], threshold: number): ModerationResult['detectedLabels'] {
    return labels
      .filter(label => label.Confidence >= threshold)
      .map(label => ({
        label: this.mapAWSLabel(label.Name),
        confidence: label.Confidence,
        severity: label.Confidence >= 90 ? 'critical' : 
                 label.Confidence >= 75 ? 'high' : 'medium'
      }));
  },

  parseAzureResults(result: any): ModerationResult['detectedLabels'] {
    const labels: ModerationResult['detectedLabels'] = [];
    
    if (result.IsImageAdultClassified) {
      labels.push({
        label: 'nude',
        confidence: result.AdultClassificationScore * 100,
        severity: 'critical'
      });
    }
    if (result.IsImageRacyClassified) {
      labels.push({
        label: 'sexual',
        confidence: result.RacyClassificationScore * 100,
        severity: 'high'
      });
    }

    return labels;
  },

  mapAWSLabel(labelName: string): ModerationLabel {
    const mapping: Record<string, ModerationLabel> = {
      'Explicit Nudity': 'nude',
      'Suggestive': 'sexual',
      'Violence': 'violence',
      'Drugs': 'drugs',
      'Weapons': 'weapons',
      'Hate Symbols': 'hate_symbols'
    };
    
    return mapping[labelName] || 'inappropriate_text';
  },

  calculateRiskScore(labels: ModerationResult['detectedLabels']): number {
    if (labels.length === 0) return 0;
    
    const severityWeights = { critical: 40, high: 25, medium: 15, low: 5 };
    
    return Math.min(
      labels.reduce((score, label) => 
        score + (label.confidence * severityWeights[label.severity] / 100), 0
      ),
      100
    );
  },

  determineSeverity(labels: ModerationResult['detectedLabels']): 'low' | 'medium' | 'high' | 'critical' {
    if (labels.some(l => l.severity === 'critical')) return 'critical';
    if (labels.some(l => l.severity === 'high')) return 'high';
    if (labels.some(l => l.severity === 'medium')) return 'medium';
    return 'low';
  },

  compareConfidence(a: ConfidenceLevel | undefined, b: ConfidenceLevel): number {
    const levels = { 'VERY_LOW': 1, 'LOW': 2, 'MEDIUM': 3, 'HIGH': 4, 'VERY_HIGH': 5 };
    return (levels[a || 'LOW'] || 2) - levels[b];
  },

  combineMultipleProviderResults(results: PromiseSettledResult<any>[]): Partial<ModerationResult> {
    // Combine results from multiple AI providers for better accuracy
    // Implementation would average confidence scores and combine labels
    return { riskScore: 50, confidence: 'MEDIUM' };
  },

  hasExifData(imageBuffer: Buffer): boolean {
    // Check for EXIF data presence
    return imageBuffer.slice(0, 2).toString('hex') === 'ffd8'; // JPEG
  },

  hasSuspiciousExifData(imageBuffer: Buffer): boolean {
    // Analyze EXIF data for suspicious patterns
    return false; // Simplified for demo
  },

  hasSuspiciousHeader(header: Buffer): boolean {
    // Check for suspicious file headers or modified signatures
    const headerHex = header.toString('hex');
    const suspiciousPatterns = ['deadbeef', 'cafebabe']; // Example patterns
    return suspiciousPatterns.some(pattern => headerHex.includes(pattern));
  }
};
