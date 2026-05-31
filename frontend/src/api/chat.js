const API_BASE = import.meta.env.VITE_BACKEND_URL || "";
export async function sendMessage(message, apiKey = null) {
  const payload = { message };
  if (apiKey) {
    payload.apiKey = apiKey;
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  return res.json();
}