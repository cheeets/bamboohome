const API_BASE = import.meta.env.VITE_API_BASE || ''

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Payment request failed (${response.status})`)
  }
  return data
}

export async function fetchPaymentConfig() {
  const response = await fetch(`${API_BASE}/api/payment-config`)
  return parseJsonResponse(response)
}

export async function createPaymongoCheckout(payload) {
  const response = await fetch(`${API_BASE}/api/create-paymongo-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(response)
}

export async function verifyPaymongoPayment({ checkoutSessionId, orderIds }) {
  const response = await fetch(`${API_BASE}/api/verify-paymongo-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkoutSessionId, orderIds }),
  })
  return parseJsonResponse(response)
}
