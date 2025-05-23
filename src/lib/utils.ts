
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseBase64Image(base64: string): string {
  // Check if the base64 string already has a data URI prefix
  if (base64.startsWith('data:image')) {
    return base64;
  }
  
  // Add the data URI prefix if it's missing
  return `data:image/png;base64,${base64}`;
}
