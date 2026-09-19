import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env') });
if (!process.env.GROQ_API_KEY) {
  dotenv.config({ path: resolve(__dirname, '..', 'backend', '.env') });
}

const MODEL_FALLBACK_CHAIN = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "groq/compound",
  "groq/compound-mini",
];

async function createChatCompletionWithFallback(groq, params, modelChain = MODEL_FALLBACK_CHAIN) {
  let lastError = null;
  for (const model of modelChain) {
    try {
      return await groq.chat.completions.create({ ...params, model });
    } catch (err) {
      lastError = err;
      const msg = (err?.error?.message || err?.message || "").toLowerCase();
      if (
        msg.includes("decommissioned") ||
        msg.includes("does not exist") ||
        msg.includes("model_not_found") ||
        msg.includes("no access")
      ) {
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error("All models in the fallback chain failed.");
}

function generateFallbackInsights(products) {
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

export default async function handler(req, res) {
  // Set CORS headers to allow all origins for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const products = req.body?.products;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No product data was provided.",
      });
    }

    // If GROQ_API_KEY is not set, return fallback analytical report immediately
    if (!process.env.GROQ_API_KEY) {
      const fallbackReport = generateFallbackInsights(products);
      return res.json({
        success: true,
        reply: fallbackReport,
        mostSoldProduct: products[0] || null,
      });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const validProducts = products
      .filter((product) => product && typeof product.name === "string" && product.name.trim() !== "")
      .map((product) => ({
        id: product.id || undefined,
        name: product.name.trim(),
        sold: Math.max(0, Number(product.sold) || 0),
        stock: Math.max(0, Number(product.stock) || 0),
        price: Math.max(0, Number(product.price) || 0),
        category: product.category || 'Unknown',
        estimatedRevenue: Math.max(0, Number(product.sold) || 0) * Math.max(0, Number(product.price) || 0),
      }));

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid product data was provided.",
      });
    }

    const sortedProducts = [...validProducts].sort(
      (a, b) => b.sold - a.sold
    );

    const mostSoldProduct = sortedProducts[0] || null;
    const worstSoldProduct = sortedProducts.length > 1 ? sortedProducts[sortedProducts.length - 1] : null;
    const lowStockProducts = validProducts.filter((product) => product.stock > 0 && product.stock <= 5);
    const outOfStockProducts = validProducts.filter((product) => product.stock <= 0);
    const revenueOpportunities = validProducts
      .filter((product) => product.sold > 0)
      .slice(0, 5)
      .map((product) => ({
        name: product.name,
        sold: product.sold,
        potentialRevenue: product.estimatedRevenue,
      }));

    const completion = await createChatCompletionWithFallback(groq, {
      messages: [
        {
          role: "system",
          content: `
You are a professional e-commerce sales analyst for Bamboo Home.

Analyze the product data provided and produce a concise but actionable sales advisor report.

Requirements:
- Use only the product data supplied in the request.
- Identify the best-selling product and the slowest-selling product.
- Highlight low-stock and out-of-stock products.
- Estimate revenue opportunities using the provided price and sales data.
- Recommend inventory actions, marketing actions, discount ideas, bundles, and seasonal promotions.
- Use a professional and practical business tone.
- Do not invent unsupported facts, products, or percentages.
- Format the response exactly with the headings below and use bullet points for readability:

AI Sales Advisor

Business Summary
- Briefly summarize the seller's current sales performance.

Best-Selling Product
- Identify the product with the highest sales and explain why it is performing well.

Slow-Selling Products
- Identify products with low or no sales and provide possible reasons.

Inventory Alerts
- Identify products with low stock or out of stock and recommend appropriate actions.

Revenue Opportunities
- Suggest ways to increase sales and maximize revenue based on the available data.

Marketing Suggestions
- Recommend promotional strategies, featured products, seasonal campaigns, bundles, or discounts.

Recommended Actions
- Provide a concise list of practical next steps the seller should take to improve sales and inventory management.
          `.trim(),
        },
        {
          role: "user",
          content: `
Best-selling product candidate:
${JSON.stringify(mostSoldProduct, null, 2)}

Slowest-selling product candidate:
${JSON.stringify(worstSoldProduct, null, 2)}

Low-stock products:
${JSON.stringify(lowStockProducts, null, 2)}

Out-of-stock products:
${JSON.stringify(outOfStockProducts, null, 2)}

Revenue opportunity candidates:
${JSON.stringify(revenueOpportunities, null, 2)}

All products:
${JSON.stringify(sortedProducts, null, 2)}

Write the report using the exact section headings and keep it clear, useful, and concise.
          `.trim(),
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 700,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "No sales analysis was generated.";

    res.json({
      success: true,
      mostSoldProduct,
      reply,
    });
  } catch (error) {
    console.error("Sales insights error:", error);

    res.status(500).json({
      success: false,
      error: "The AI sales analysis is temporarily unavailable.",
    });
  }
}