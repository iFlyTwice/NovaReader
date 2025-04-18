# NovaReader Logger Utility

This directory contains utility functions and modules used across the NovaReader extension.

## Logger

The `logger.ts` module provides a centralized logging utility for consistent, organized, and visually enhanced console logging throughout the NovaReader extension.

### Features

- **Consistent Formatting**: All logs follow a standardized format with timestamps, module names, and log levels
- **Color Coding**: Different modules use different colors for easier visual distinction in the console
- **Log Levels**: Support for DEBUG, INFO, WARN, and ERROR log levels with filtering
- **Module-based Logging**: Create logger instances for specific modules
- **Timestamps**: Optional timestamps for precise timing information
- **Grouping**: Support for grouping related logs together

### Usage

#### Basic Usage

```typescript
import { createLogger } from '../utils/logger';

// Create a logger instance for your module
const logger = createLogger('MyModule');

// Log at different levels
logger.debug('Detailed debug information');
logger.info('General information about application flow');
logger.warn('Warning about potential issues');
logger.error('Error information about failures', errorObject);
```

#### Grouping Related Logs

```typescript
logger.group('Initialization Process');
logger.info('Step 1: Loading configuration');
logger.info('Step 2: Setting up event listeners');
logger.info('Step 3: Initializing components');
logger.groupEnd();
```

#### Controlling Log Levels

```typescript
import { LogLevel, setLogLevel } from '../utils/logger';

// Only show warnings and errors
setLogLevel(LogLevel.WARN);

// Show all logs including debug
setLogLevel(LogLevel.DEBUG);

// Disable all logging
setLogLevel(LogLevel.NONE);
```

### Module Colors

The logger automatically assigns colors to different modules for better visual distinction:

- Player/SidePlayer: Green (#4caf50)
- TopPlayer: Blue (#2196f3)
- VoiceSelector: Purple (#9c27b0)
- VoiceStyler: Orange (#ff9800)
- AudioPlayer: Pink (#e91e63)
- TextHighlighter: Brown (#795548)
- API/TokenManager: Blue Grey (#607d8b)
- Extension: Indigo (#3f51b5)
- SelectionButton: Deep Orange (#ff5722)

### Best Practices

1. **Create Module-Specific Loggers**: Create a logger instance for each module at the top of the file
2. **Use Appropriate Log Levels**:
   - DEBUG: Detailed information for troubleshooting
   - INFO: General information about application flow
   - WARN: Potential issues that don't prevent operation
   - ERROR: Issues that prevent normal operation
3. **Include Relevant Context**: Include useful context in log messages
4. **Group Related Logs**: Use groups for related operations
5. **Be Consistent**: Use similar log messages for similar operations
