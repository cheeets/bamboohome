const API_URL = import.meta.env.VITE_API_URL || "";

export async function askBuyerSupport({
  message,
  userName = '',
  history = [],
}) {
  const cleanMessage = message?.trim();

  if (!cleanMessage) {
    throw new Error('Please enter a message.');
  }

  const response = await fetch(`${API_URL}/api/buyer-support`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: cleanMessage,
      userName,
      history: Array.isArray(history) ? history.slice(-10) : [],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get buyer support response');
  }

  return data.reply;
}

export async function askSellerSupport({
  message,
  isSuspended = false,
  suspensionReason = '',
  suspensionTimeRemaining = '',
  sellerName = '',
  storeName = '',
  history = [],
}) {
  const cleanMessage = message?.trim();

  if (!cleanMessage) {
    throw new Error('Please enter a message.');
  }

  const response = await fetch(`${API_URL}/api/seller-support`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: cleanMessage,
      isSuspended,
      suspensionReason,
      suspensionTimeRemaining,
      sellerName,
      storeName,
      history: Array.isArray(history) ? history.slice(-10) : [],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get seller support response');
  }

  return data.reply;
}

export async function generateSalesInsights(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("There are no products to analyze.");
  }

  const response = await fetch(`${API_URL}/api/sales-insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to generate sales insights.");
  }

  return {
    reply: data.reply || data.message || "",
    mostSoldProduct: data.mostSoldProduct || null,
  };
}