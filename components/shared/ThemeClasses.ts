// Shared theme-aware class names for consistency across components

export const themeClasses = {
  // Page background
  page: 'bg-[var(--app-bg)] min-h-screen',
  
  // Text colors
  textPrimary: 'text-[var(--text-primary)]',
  textSecondary: 'text-[var(--text-secondary)]',
  textMuted: 'text-[var(--text-muted)]',
  textNeonGreen: 'text-[var(--neon-green)]',
  textPurple: 'text-[var(--primary-purple)]',
  
  // Card backgrounds
  card: 'bg-gradient-to-br from-[var(--card-bg-from)] to-[var(--card-bg-to)]',
  cardBorder: 'border-[var(--card-border)]',
  
  // Input fields
  input: 'bg-gradient-to-r from-[var(--input-bg-from)] to-[var(--input-bg-to)] border-2 border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--neon-green)] focus:shadow-[0_0_20px_rgba(57,255,20,0.3)] transition-all duration-300',
  
  // Buttons
  buttonPrimary: 'bg-gradient-to-r from-[var(--primary-purple)] to-[var(--secondary-purple)] text-[var(--neon-green)] shadow-[0_0_20px_rgba(127,63,242,0.5)] hover:shadow-[0_0_30px_rgba(127,63,242,0.7)] transition-all duration-300',
  
  // Headers
  header: 'text-[var(--neon-green)] tracking-wider drop-shadow-[0_0_10px_rgba(57,255,20,0.8)]',
  headerLine: 'h-1 w-32 bg-gradient-to-r from-[var(--primary-purple)] to-[var(--neon-green)] rounded-full shadow-[0_0_10px_rgba(127,63,242,0.6)]',
};
