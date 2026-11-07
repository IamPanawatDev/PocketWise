/**
 * Web Haptic Feedback Utility for PocketWise.
 * Provides subtle tactile vibration patterns for mobile interactions (tabs, buttons, actions).
 * Gracefully degrades on unsupported browsers (e.g. standard desktop, iOS Safari without PWA).
 */

export const HAPTIC_PATTERNS: Record<string, number | number[]> = {
  /** Subtle 10ms tap for tab switching and menu toggles */
  light: 10,
  /** Noticeable 25ms pulse for primary actions like quick add */
  medium: 25,
  /** Strong 40ms pulse for delete or warning interactions */
  heavy: 40,
  /** Double pulse [15ms, 50ms, 15ms] for successful confirmations */
  success: [15, 50, 15],
  /** Warning vibration [30ms, 80ms, 30ms] */
  warning: [30, 80, 30],
};

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning";

/**
 * Triggers a device vibration using Web Vibration API if supported.
 * Safely handles environments where vibration is unavailable or blocked.
 *
 * @param type The intensity or pattern of haptic feedback (defaults to 'light')
 */
export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    const isEnabled = localStorage.getItem("pocketwise_haptics_enabled") !== "false";
    if (!isEnabled) {
      return;
    }

    const pattern = HAPTIC_PATTERNS[type] ?? 10;
    navigator.vibrate(pattern as VibratePattern);
  } catch {
    // Silently ignore if blocked by browser policy or permissions
  }
}
