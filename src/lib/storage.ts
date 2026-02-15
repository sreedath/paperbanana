import type { HistoryItem } from "./types";

const API_KEY_KEY = "paperbanana_api_key";
const HISTORY_KEY = "paperbanana_history";
const MAX_HISTORY = 20;

// --- API Key ---

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(API_KEY_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key);
}

export function removeApiKey(): void {
  localStorage.removeItem(API_KEY_KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// --- History ---

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function addHistoryItem(item: HistoryItem): void {
  const history = getHistory();
  history.unshift(item);
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // QuotaExceededError — drop oldest items until it fits
    while (history.length > 1) {
      history.pop();
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return;
      } catch {
        // keep popping
      }
    }
  }
}

export function removeHistoryItem(id: string): void {
  const history = getHistory().filter((item) => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// --- Logo ---

const LOGO_KEY = "paperbanana_logo";

export function getLogo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOGO_KEY);
}

export function setLogo(dataUrl: string): void {
  localStorage.setItem(LOGO_KEY, dataUrl);
}

export function removeLogo(): void {
  localStorage.removeItem(LOGO_KEY);
}

export function hasLogo(): boolean {
  return !!getLogo();
}
