import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names conditionally + de-duplicate conflicting
 * utilities (e.g., `px-2` overriding `px-4`). Standard shadcn helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
