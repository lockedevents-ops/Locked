/**
 * Dark Mode Utility Functions
 * Common class patterns for consistent dark mode styling across admin pages
 */

export const darkModeClasses = {
  // Backgrounds
  background: {
    primary: 'bg-white dark:bg-neutral-900',
    secondary: 'bg-gray-50 dark:bg-neutral-700',
    tertiary: 'bg-gray-100 dark:bg-neutral-600',
  },
  
  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
    muted: 'text-gray-400 dark:text-gray-500',
  },
  
  // Borders
  border: {
    primary: 'border-gray-200 dark:border-neutral-800',
    secondary: 'border-gray-300 dark:border-neutral-800',
    accent: 'border-primary dark:border-primary',
  },
  
  // Form elements
  form: {
    input: 'bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400',
    select: 'bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-gray-100',
    button: {
      primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
      secondary: 'bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    },
  },
  
  // Table styles
  table: {
    header: 'bg-gray-50 dark:bg-neutral-700',
    row: 'bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700',
    divider: 'divide-gray-200 dark:divide-neutral-700',
  },
  
  // Card styles
  card: {
    primary: 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800',
    secondary: 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-800',
  },
  
  // Status badges
  status: {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    suspended: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    neutral: 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200',
  },
  
  // Role badges
  role: {
    admin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    'super_admin': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    'support_agent': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  'venue_owner': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    user: 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200',
  },
};

/**
 * Apply dark mode classes to common elements
 */
export const applyDarkMode = {
  // Main containers
  pageContainer: 'space-y-6',
  pageHeader: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
  pageTitle: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  pageDescription: 'text-gray-600 dark:text-gray-400',
  
  // Cards and sections
  card: 'bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4',
  section: 'bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6',
  
  // Tables
  table: 'min-w-full divide-y divide-gray-200 dark:divide-neutral-700',
  tableHeader: 'bg-gray-50 dark:bg-neutral-700',
  tableHeaderCell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
  tableBody: 'bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700',
  tableRow: 'hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors',
  tableCell: 'px-6 py-4 whitespace-nowrap',
  
  // Forms
  formGroup: 'space-y-2',
  formLabel: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
  formInput: 'w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary',
  formSelect: 'w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary',
  
  // Buttons
  button: {
    primary: 'inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors',
    secondary: 'px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600 cursor-pointer',
    danger: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer',
  },
  
  // Pagination
  pagination: 'bg-white dark:bg-neutral-900 px-4 py-3 border-t border-gray-200 dark:border-neutral-800 sm:px-6',
  paginationButton: 'relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-neutral-800 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed',
  paginationActive: 'z-10 bg-primary border-primary text-white',
  paginationInactive: 'bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-600',
};

/**
 * Common dark mode patterns for specific components
 */
export const componentPatterns = {
  // User avatar
  userAvatar: 'h-10 w-10 rounded-full bg-gray-200 dark:bg-neutral-600 flex items-center justify-center',
  userAvatarText: 'text-sm font-medium text-gray-600 dark:text-gray-400',
  
  // Search input
  searchInput: 'w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary',
  searchIcon: 'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500',
  
  // Filter selects
  filterSelect: 'px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary',
  
  // Action buttons
  actionButton: {
    view: 'text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary',
    edit: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
    suspend: 'text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300',
    reactivate: 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300',
    delete: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300',
  },
};
