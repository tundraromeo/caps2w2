import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export async function logActivity({ activityType, description, userId = null, metadata = {} }) {
  try {
    const activityData = {
      activityType,
      description,
      userId,
      metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
    }

    // Send to API endpoint if available
    try {
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData)
      });
    } catch (apiError) {
      // Silently fail if API endpoint doesn't exist
      console.warn('Activity logging API not available:', apiError.message);
    }
  } catch (error) {
    // Silently fail to prevent breaking the main application
    console.warn('Activity logging failed:', error.message);
  }
}