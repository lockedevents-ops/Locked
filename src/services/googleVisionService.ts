// Minimal stub for Google Vision integration used by imageModerationService.
// In production, replace with real API calls to Google Cloud Vision.

export const googleVisionService = {
  analyzeImage: async (_imageBuffer: any, _config: any) => {
    return {
      detectedLabels: [],
      riskScore: 0,
      confidence: 'LOW' as const,
    };
  },
};
