/**
 * TOON Format Utilities
 * Compact format: users[2]{id,name}: 1,Alice; 2,Bob
 * Replaces JSON for localStorage to save space
 */

// ─── CONVERT JSON TO TOON ─────────────────────────────────
exports.jsonToToon = (data, arrayName = 'data') => {
  if (!data) return '';
  
  // Array of objects
  if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
    const keys = Object.keys(data[0]);
    const rows = data.map(obj => 
      keys.map(k => 
        obj[k] === null ? '' : 
        obj[k] === undefined ? '' : 
        String(obj[k]).includes(',') ? `"${obj[k]}"` : obj[k]
      ).join(',')
    ).join(';');
    
    return `${arrayName}[${data.length}]{${keys.join(',')}}:\n${rows}`;
  }
  
  // Object (key-value pairs)
  if (typeof data === 'object' && !Array.isArray(data)) {
    const pairs = Object.entries(data)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}:${String(v).includes(',') ? `"${v}"` : v}`)
      .join('|');
    return pairs;
  }
  
  return String(data);
};

// ─── CONVERT TOON TO JSON ─────────────────────────────────
exports.toonToJson = (toon) => {
  if (!toon || typeof toon !== 'string') return {};
  
  // Array format: users[2]{id,name}: ...
  const arrayMatch = toon.match(/^(\w+)\[(\d+)\]\{([^}]+)\}:\n(.+)$/m);
  if (arrayMatch) {
    const [, name, count, keysStr, rowsStr] = arrayMatch;
    const keys = keysStr.split(',');
    const rows = rowsStr.split(';').map(row => {
      const values = row.split(',').map(v => 
        v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v
      );
      return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
    });
    return rows;
  }
  
  // Key-value format: key1:val1|key2:val2
  const obj = {};
  toon.split('|').forEach(pair => {
    const [k, v] = pair.split(':');
    if (k && v) {
      obj[k] = v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
    }
  });
  return obj;
};

// ─── STORE IN TOON FORMAT ─────────────────────────────────
exports.storeToon = (key, data) => {
  const toonData = exports.jsonToToon(data);
  localStorage.setItem(key, toonData);
};

// ─── RETRIEVE FROM TOON FORMAT ─────────────────────────────
exports.retrieveToon = (key) => {
  const toonData = localStorage.getItem(key);
  return exports.toonToJson(toonData);
};
