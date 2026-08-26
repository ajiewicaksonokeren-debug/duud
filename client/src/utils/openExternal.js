import { Browser } from '@capacitor/browser';

// Opens a URL in the system browser (Chrome Custom Tabs on Android) instead
// of an embedded webview. On web this falls back to a normal new tab.
export function openExternal(url) {
  return Browser.open({ url });
}
