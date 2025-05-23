
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses and cleans a base64 image string from the API response
 * Handles various formats returned by different APIs
 */
export function parseBase64Image(input: string | null | undefined): string {
  if (!input) return '';
  
  let result = input;
  
  // Check if the input is a JSON string and parse it
  if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('data:image/png;base64,{'))) {
    try {
      // Remove any data:image/png;base64, prefix before attempting to parse JSON
      const jsonStr = result.replace(/^data:image\/png;base64,/, '');
      const parsed = JSON.parse(jsonStr);
      
      // Try to find the base64 data in various locations
      if (parsed.data?.base64) {
        result = parsed.data.base64;
      } else if (parsed.base64) {
        result = parsed.base64;
      } else if (parsed.image) {
        result = parsed.image;
      } else if (parsed.data) {
        result = parsed.data;
      }
    } catch (e) {
      console.error("Error parsing base64 JSON:", e);
      // If parsing fails, continue with the original string
    }
  }
  
  // Remove any data:image/png;base64, prefix if present
  result = result.replace(/^data:image\/png;base64,/, '');
  
  // Remove any trailing JSON artifacts
  result = result.replace(/"}$/, '').replace(/"}}}$/, '').replace(/"}}"$/, '').replace(/\s+$/, '');
  
  // Check if the result already has a data URI prefix
  if (result.startsWith('data:image')) {
    return result;
  }
  
  // Add the data URI prefix if it's missing
  return `data:image/png;base64,${result}`;
}
