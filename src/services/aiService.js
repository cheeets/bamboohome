const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '';
  return envUrl.replace(/\/$/, '');
};

export async function askBuyerSupport({
  message,
  userName = '',
  history = [],
}) {
  const cleanMessage = message?.trim();

  if (!cleanMessage) {
    throw new Error('Please enter a message.');
  }

  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/api/buyer-support`, {
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

  const baseUrl = getApiUrl();
  const response = await fetch(`${baseUrl}/api/seller-support`, {
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

  const baseUrl = getApiUrl();
  const endpoint = `${baseUrl}/api/sales-insights`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products,
      }),
    });
  } catch (netErr) {
    console.error("Network error reaching sales-insights:", netErr);
    throw new Error(
      `Unable to reach the AI server. Please verify the backend is running at ${baseUrl || 'http://localhost:5000'}.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (text.trim().startsWith("<")) {
      throw new Error(
        `Server returned status ${response.status} (HTML). Ensure the backend server is running and /api/sales-insights is available.`
      );
    }
    throw new Error(text || `Server returned status ${response.status}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || "Unable to generate sales insights.");
  }

  return {
    success: true,
    reply: data.reply || data.message || "No insights generated.",
    mostSoldProduct: data.mostSoldProduct || null,
  };
}