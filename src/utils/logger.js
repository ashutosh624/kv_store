class Logger {
  constructor(component) {
    this.component = component;
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  _formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const colorCode = this._getColorCode(level);
    const resetCode = this.colors.reset;
    
    const formattedLevel = `${colorCode}[${level.toUpperCase()}]${resetCode}`;
    const formattedComponent = `${this.colors.cyan}[${this.component}]${resetCode}`;
    
    return `${timestamp} ${formattedLevel} ${formattedComponent} ${message}`;
  }

  _getColorCode(level) {
    switch (level) {
      case 'error': return this.colors.red;
      case 'warn': return this.colors.yellow;
      case 'info': return this.colors.green;
      case 'debug': return this.colors.blue;
      default: return this.colors.reset;
    }
  }

  info(message, ...args) {
    console.log(this._formatMessage('info', message), ...args);
  }

  error(message, ...args) {
    console.error(this._formatMessage('error', message), ...args);
  }

  warn(message, ...args) {
    console.warn(this._formatMessage('warn', message), ...args);
  }

  debug(message, ...args) {
    if (process.env.DEBUG || process.env.LOG_LEVEL === 'debug') {
      console.log(this._formatMessage('debug', message), ...args);
    }
  }
}

module.exports = Logger;