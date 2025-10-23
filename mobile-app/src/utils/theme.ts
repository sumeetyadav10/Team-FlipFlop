export const theme = {
  colors: {
    primary: '#38BDF8', // Vibrant Blue
    secondary: '#E879F9', // Vibrant Pink/Fuchsia
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#0D1117', // Dark Charcoal (like GitHub Dark)
    surface: '#161B22', // Lighter Charcoal
    text: {
      primary: '#E6EDF3', // Off-White
      secondary: '#7D8590', // Grey
      inverse: '#000000',
    },
    border: '#30363D', // Subtle Border
    shadow: 'rgba(56, 189, 248, 0.2)', // Vibrant Blue shadow
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};