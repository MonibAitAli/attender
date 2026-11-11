const STORAGE_KEY = "attender_device_key";
const DEVICE_HEADER = "x-attender-device";

export function getStoredDevice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeDevice(value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing or blocked storage: the cookie still carries the device.
  }
}

export function deviceHeaders(): Record<string, string> {
  const value = getStoredDevice();
  return value ? { [DEVICE_HEADER]: value } : {};
}

export function rememberDeviceFromResponse(response: Response): void {
  const value = response.headers.get(DEVICE_HEADER);
  if (value) storeDevice(value);
}
