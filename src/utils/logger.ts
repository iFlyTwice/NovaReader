/**
 * Centralized logging utility for NovaReader
 * Provides consistent formatting, log levels, and module-based filtering
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4 // Used to disable logging
}

// Current log level - can be changed at runtime
let currentLogLevel: LogLevel = LogLevel.INFO;

// Enable/disable timestamps in logs
let showTimestamps: boolean = true;

// Module colors for visual distinction in console
const moduleColors: Record<string, string> = {
  'Player': '#4caf50',      // Green
  'SidePlayer': '#4caf50',  // Green
  'TopPlayer': '#2196f3',   // Blue
  'VoiceSelector': '#9c27b0', // Purple
  'VoiceStyler': '#ff9800',  // Orange
  'AudioPlayer': '#e91e63',  // Pink
  'TextHighlighter': '#795548', // Brown
  'API': '#607d8b',         // Blue Grey
  'TokenManager': '#607d8b', // Blue Grey
  'Extension': '#3f51b5',   // Indigo
  'SelectionButton': '#ff5722', // Deep Orange
  'default': '#757575'      // Grey
};

/**
 * Get color for a module
 */
const getModuleColor = (module: string): string => {
  // Check for partial matches
  for (const [key, color] of Object.entries(moduleColors)) {
    if (module.includes(key)) {
      return color;
    }
  }
  return moduleColors.default;
};

/**
 * Format a log message with timestamp, module, and consistent styling
 */
const formatLogMessage = (level: string, module: string, message: string): string[] => {
  const timestamp = showTimestamps ? `[${new Date().toISOString().split('T')[1].slice(0, -1)}]` : '';
  const moduleColor = getModuleColor(module);
  
  return [
    `%c${timestamp} %c[${module}]%c ${level}: ${message}`,
    'color: #888;', // Timestamp style
    `color: ${moduleColor}; font-weight: bold;`, // Module style
    'color: inherit;' // Message style
  ];
};

/**
 * Set the current log level
 */
export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level;
  info('Logger', `Log level set to ${LogLevel[level]}`);
};

/**
 * Enable or disable timestamps in logs
 */
export const setShowTimestamps = (show: boolean): void => {
  showTimestamps = show;
};

/**
 * Debug level log - for detailed troubleshooting information
 */
export const debug = (module: string, message: string, ...args: any[]): void => {
  if (currentLogLevel <= LogLevel.DEBUG) {
    console.debug(...formatLogMessage('DEBUG', module, message), ...args);
  }
};

/**
 * Info level log - for general information about application flow
 */
export const info = (module: string, message: string, ...args: any[]): void => {
  if (currentLogLevel <= LogLevel.INFO) {
    console.info(...formatLogMessage('INFO', module, message), ...args);
  }
};

/**
 * Warn level log - for potential issues that don't prevent operation
 */
export const warn = (module: string, message: string, ...args: any[]): void => {
  if (currentLogLevel <= LogLevel.WARN) {
    console.warn(...formatLogMessage('WARN', module, message), ...args);
  }
};

/**
 * Error level log - for issues that prevent normal operation
 */
export const error = (module: string, message: string, ...args: any[]): void => {
  if (currentLogLevel <= LogLevel.ERROR) {
    console.error(...formatLogMessage('ERROR', module, message), ...args);
  }
};

/**
 * Group logs together (useful for related logs)
 */
export const group = (module: string, title: string): void => {
  if (currentLogLevel < LogLevel.NONE) {
    const moduleColor = getModuleColor(module);
    console.group(`%c[${module}]%c ${title}`, `color: ${moduleColor}; font-weight: bold;`, 'color: inherit;');
  }
};

/**
 * End a log group
 */
export const groupEnd = (): void => {
  if (currentLogLevel < LogLevel.NONE) {
    console.groupEnd();
  }
};

/**
 * Create a logger instance for a specific module
 */
export const createLogger = (module: string) => {
  return {
    debug: (message: string, ...args: any[]) => debug(module, message, ...args),
    info: (message: string, ...args: any[]) => info(module, message, ...args),
    warn: (message: string, ...args: any[]) => warn(module, message, ...args),
    error: (message: string, ...args: any[]) => error(module, message, ...args),
    group: (title: string) => group(module, title),
    groupEnd: () => groupEnd()
  };
};

// Default export for easy importing
export default {
  debug,
  info,
  warn,
  error,
  group,
  groupEnd,
  setLogLevel,
  setShowTimestamps,
  createLogger,
  LogLevel
};
