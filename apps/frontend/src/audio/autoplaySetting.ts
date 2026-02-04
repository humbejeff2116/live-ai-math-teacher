export const AUTOPLAY_KEY = "autoplayExplanations";

export function getAutoplay(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTOPLAY_KEY) === "true";
}

export function setAutoplay(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTOPLAY_KEY, String(value));
}
