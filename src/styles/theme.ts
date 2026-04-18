// Locked Design System

// Primary colors
export const colors = {
  // Primary colors
  primary: {
    main: '#5D5FEF', // Vibrant purple-blue
    light: '#EEEEFF', // Light lavender
    dark: '#4547B7', // Deep purple-blue
  },
  
  // Secondary colors
  accent: '#FF6B6B', // Coral red
  success: '#10B981', // Emerald green
  warning: '#FBBF24', // Amber yellow
  error: '#EF4444', // Ruby red
  
  // Neutral palette (light mode)
  light: {
    heading: '#1F2937',
    textPrimary: '#374151',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    background: '#FFFFFF',
    cardBackground: '#FFFFFF',
  },
  
  // Neutral palette (dark mode)
  dark: {
    heading: '#F8F8FF',
    textPrimary: '#E1E1E8',
    textSecondary: '#A9A9B7',
    border: 'rgba(93, 95, 239, 0.15)',
    background: '#121521',
    cardBackground: 'rgba(18, 21, 33, 0.6)',
  },
};

// Typography
export const typography = {
  fontFamily: 'Inter, sans-serif',
  headingSizes: {
    h1: '2.5rem',  // 40px
    h2: '2rem',    // 32px
    h3: '1.5rem',  // 24px
    h4: '1.25rem', // 20px
  },
  bodySizes: {
    body: '1rem',      // 16px
    small: '0.875rem', // 14px
  },
};

// Border radius
export const borderRadius = {
  small: '4px',
  medium: '8px',
  large: '12px',
  extraLarge: '16px',
};

// Box shadows
export const boxShadows = {
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};
