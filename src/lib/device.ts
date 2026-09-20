const KEY = "sat_device_id";

// Identifies this browser to the backend so the server-side timer and the
// 12-hour access window stick to the same device. Only call from the client
// (after mount or inside event handlers).
export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
