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

function generateClientFallbackInsights(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return "AI Sales Advisor\n\nNo products available to analyze.";
  }

  const validProducts = products
    .filter((p) => p && (p.name || p.title))
    .map((p) => ({
      name: p.name || p.title || 'Unnamed Product',
      sold: Math.max(0, Number(p.sold || p.salesCount || p.soldCount || 0)),
      stock: Math.max(0, Number(p.stock || 0)),
      price: Math.max(0, Number(p.price || 0)),
      category: p.category || 'General',
    }));

  if (validProducts.length === 0) {
    return "AI Sales Advisor\n\nNo valid product data found for analysis.";
  }

  const sortedBySales = [...validProducts].sort((a, b) => b.sold - a.sold);
  const bestSeller = sortedBySales[0];
  const slowSellers = sortedBySales.filter((p) => p.sold === 0);
  const lowStock = validProducts.filter((p) => p.stock > 0 && p.stock <= 5);
  const outOfStock = validProducts.filter((p) => p.stock <= 0);

  const totalSalesCount = validProducts.reduce((sum, p) => sum + p.sold, 0);
  const totalRevenueEst = validProducts.reduce((sum, p) => sum + p.sold * p.price, 0);

  let report = `AI Sales Advisor\n\n`;

  report += `Business Summary\n`;
  report += `- Analyzed ${validProducts.length} product listing(s) across your store.\n`;
  report += `- Total recorded sales: ${totalSalesCount} unit(s) with an estimated revenue of ₱${totalRevenueEst.toLocaleString('en-US', { minimumFractionDigits: 2 })}.\n\n`;

  report += `Best-Selling Product\n`;
  if (bestSeller && bestSeller.sold > 0) {
    report += `- Top performer: "${bestSeller.name}" with ${bestSeller.sold} unit(s) sold at ₱${bestSeller.price.toLocaleString()}.\n`;
    report += `- High customer demand. Consider maintaining higher stock levels to prevent stockouts.\n\n`;
  } else {
    report += `- No sales recorded yet across products. Focus on initial promotions and featured listings.\n\n`;
  }

  report += `Slow-Selling Products\n`;
  if (slowSellers.length > 0) {
    const list = slowSellers.slice(0, 3).map((p) => `"${p.name}"`).join(', ');
    report += `- Low activity on ${slowSellers.length} item(s): ${list}.\n`;
    report += `- Recommendation: Review pricing, improve product images, or offer bundle discounts.\n\n`;
  } else {
    report += `- All current items have active sales momentum.\n\n`;
  }

  report += `Inventory Alerts\n`;
  if (outOfStock.length > 0) {
    const outList = outOfStock.map((p) => `"${p.name}"`).join(', ');
    report += `- OUT OF STOCK (${outOfStock.length}): ${outList}. Restock urgently to capture missed demand.\n`;
  }
  if (lowStock.length > 0) {
    const lowList = lowStock.map((p) => `"${p.name}" (${p.stock} remaining)`).join(', ');
    report += `- LOW STOCK (${lowStock.length}): ${lowList}.\n`;
  }
  if (outOfStock.length === 0 && lowStock.length === 0) {
    report += `- Healthy inventory levels across all catalog items.\n`;
  }
  report += `\n`;

  report += `Revenue Opportunities\n`;
  const highMarginItem = [...validProducts].sort((a, b) => b.price - a.price)[0];
  if (highMarginItem) {
    report += `- Feature high-value product "${highMarginItem.name}" (₱${highMarginItem.price.toLocaleString()}) on store home banner.\n`;
  }
  report += `- Create product bundles combining best sellers with slow-moving stock to boost average order value.\n\n`;

  report += `Recommended Actions\n`;
  report += `- 1. Immediately restock items marked low or out-of-stock.\n`;
  report += `- 2. Run promotional discounts or spotlight campaigns for slow-moving products.\n`;
  report += `- 3. Keep store contact details and barangay delivery locations updated.`;

  return report;
}

export async function generateSalesInsights(products) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("There are no products to analyze.");
  }

  const baseUrl = getApiUrl();
  const endpoint = `${baseUrl}/api/sales-insights`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ products }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (response.ok && data.success !== false && data.reply) {
        return {
          success: true,
          reply: data.reply,
          mostSoldProduct: data.mostSoldProduct || null,
        };
      }
    }
  } catch (err) {
    console.warn("API sales-insights endpoint unreachable or failed, falling back to local analyzer:", err);
  }

  // Fallback to client-side analytical engine if API endpoint is unreachable or fails
  const fallbackReply = generateClientFallbackInsights(products);
  return {
    success: true,
    reply: fallbackReply,
    mostSoldProduct: products[0] || null,
  };
}