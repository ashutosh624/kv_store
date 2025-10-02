class CommandParser {
  static parse(cmdLine) {
    if (!cmdLine || typeof cmdLine !== 'string') {
      throw new Error('Invalid command: must be a non-empty string');
    }

    const trimmed = cmdLine.trim();
    if (!trimmed) {
      throw new Error('Invalid command: empty command');
    }

    // Split by whitespace but handle quoted strings
    const parts = this._splitWithQuotes(trimmed);
    
    return {
      operation: parts[0].toLowerCase(),
      args: parts.slice(1),
      raw: trimmed
    };
  }

  static _splitWithQuotes(str) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    if (inQuotes) {
      throw new Error('Invalid command: unclosed quote');
    }

    return parts;
  }
}

module.exports = CommandParser;