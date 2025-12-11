/**
 * Response Serialization Utilities
 * 
 * Handles JSON serialization for response bodies with edge case handling.
 */

/**
 * Safely serialize a value to JSON, handling edge cases like:
 * - Circular references
 * - undefined values
 * - BigInt values
 * - Functions
 * - Symbols
 * 
 * @param value - The value to serialize
 * @returns The serialized JSON string, or null if serialization fails
 */
export function safeSerialize(value: any): string | null {
  if (value === undefined) {
    return 'null';
  }

  try {
    const seen = new WeakSet();
    
    return JSON.stringify(value, (key, val) => {
      // Handle undefined (convert to null)
      if (val === undefined) {
        return null;
      }
      
      // Handle BigInt
      if (typeof val === 'bigint') {
        return val.toString();
      }
      
      // Handle functions (skip them)
      if (typeof val === 'function') {
        return undefined;
      }
      
      // Handle symbols (skip them)
      if (typeof val === 'symbol') {
        return undefined;
      }
      
      // Handle circular references
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      
      return val;
    });
  } catch (e) {
    // If all else fails, return null
    return null;
  }
}

/**
 * Safely deserialize a JSON string
 * 
 * @param json - The JSON string to deserialize
 * @returns The deserialized value, or null if deserialization fails
 */
export function safeDeserialize(json: string): any {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Check if a value can be safely serialized to JSON
 * 
 * @param value - The value to check
 * @returns true if the value can be serialized
 */
export function isSerializable(value: any): boolean {
  const serialized = safeSerialize(value);
  return serialized !== null;
}

/**
 * Serialize and deserialize a value (round-trip)
 * Used to ensure data consistency when passing through JSON
 * 
 * @param value - The value to round-trip
 * @returns The round-tripped value, or null if it fails
 */
export function roundTrip(value: any): any {
  const serialized = safeSerialize(value);
  if (serialized === null) {
    return null;
  }
  return safeDeserialize(serialized);
}
