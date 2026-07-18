import { initializeApp } from "firebase-admin/app";
import { https, defineSecret } from "firebase-functions/v2";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

initializeApp();

const groqApiKey = defineSecret("GROQ_API_KEY");

const app = express();
app.use(cors());
app.use(express.json());

let groq;
try {
  // Try to get GROQ_API_KEY from Firebase Secrets or process.env
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    groq = new Groq({ apiKey });
  }
} catch (e) {
  console.warn("Could not initialize Groq SDK. Check API key configuration.");
}

app.post("/api/seller-support", async (req, res) => {
  try {
    if (!groq) {
      return res.status(500).json({
        success: false,
        error: "AI service configuration is missing. Please set up GROQ_API_KEY.",
      });
    }

    const message = req.body?.message;
    const isSuspended = req.body?.isSuspended === true;
    const suspensionReason = req.body?.suspensionReason || '';
    const suspensionTimeRemaining = req.body?.suspensionTimeRemaining || '';
    const sellerName = req.body?.sellerName || '';
    const storeName = req.body?.storeName || '';
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid message.',
      });
    }

    const systemPrompt = isSuspended
      ? `
You are the official AI Seller Support Assistant for Bamboo Home.

The seller's account is currently suspended.

Seller name:
${sellerName || 'Not provided'}

Store name:
${storeName || 'Not provided'}

Suspension reason:
${suspensionReason || 'No specific reason provided'}

Suspension time remaining:
${suspensionTimeRemaining || 'Unknown'}

You may:
- Explain the provided suspension reason in simple language
- Explain the remaining suspension time
- Explain marketplace rules
- Recommend corrective actions
- Explain how to request a review
- Explain how to contact the administrator
- Suggest ways to avoid future violations

You must not:
- Remove the suspension
- Promise that the account will be restored
- Shorten the suspension period
- Override an administrator decision
- Modify Firebase or account data
- Provide instructions for bypassing restrictions
- Invent a suspension reason
- Pretend to be an administrator

If asked whether you can remove the suspension, clearly state that only an authorized administrator can review or change the suspension.

Keep the response respectful, professional, and concise.

Do not use emojis.
          `.trim()
      : `
You are the official AI Seller Support Assistant for Bamboo Home, a multi-vendor bamboo furniture marketplace.

Help sellers understand how to use the platform.

You may provide guidance about:
- Product management
- Inventory management
- Orders
- Deliveries
- Analytics
- Notifications
- Buyer messages
- Store management
- Marketplace rules
- Reports and warnings
- Improving seller practices

Important rules:
- Do not claim to directly change Firebase data.
- Do not claim to approve, cancel, or update orders.
- Do not claim to edit products.
- Do not pretend to be an administrator.
- Do not invent Bamboo Home features.
- Give step-by-step guidance when appropriate.
- Keep the response clear, professional, and concise.
- Do not use emojis.
- When uncertain about a system feature, tell the seller to contact the administrator.
          `.trim()

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...history.map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content || '',
      })),
      {
        role: 'user',
        content: message.trim(),
      },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.35,
      max_completion_tokens: 600,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      'Sorry, I could not generate a response.';

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Seller support error:", error);

    res.status(500).json({
      success: false,
      error: "The AI support assistant is temporarily unavailable.",
    });
  }
});

app.post("/api/sales-insights", async (req, res) => {
  try {
    if (!groq) {
      return res.status(500).json({
        success: false,
        error: "AI service configuration is missing. Please set up GROQ_API_KEY.",
      });
    }

    const products = req.body?.products;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No product data was provided.",
      });
    }

    const validProducts = products
      .filter((product) => product && typeof product.name === "string")
      .map((product) => ({
        name: product.name.trim(),
        sold: Number(product.sold) || 0,
        stock: Number(product.stock) || 0,
        price: Number(product.price) || 0,
        category: product.category || 'Unknown',
        estimatedRevenue: Number(product.sold || 0) * Number(product.price || 0),
      }));

    const sortedProducts = [...validProducts].sort(
      (a, b) => b.sold - a.sold
    );

    const mostSoldProduct = sortedProducts[0];
    const worstSoldProduct = [...sortedProducts].pop();
    const lowStockProducts = validProducts.filter((product) => product.stock > 0 && product.stock <= 5);
    const outOfStockProducts = validProducts.filter((product) => product.stock <= 0);
    const revenueOpportunities = validProducts
      .filter((product) => product.sold > 0)
      .slice(0, 5)
      .map((product) => ({
        name: product.name,
        potentialRevenue: product.estimatedRevenue,
      }));

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
});

export const api = https.onRequest({ secrets: [groqApiKey] }, async (req, res) => {
  if (!groq) {
    const apiKey = groqApiKey.value();
    if (apiKey) {
      groq = new Groq({ apiKey });
    }
  }
  return app(req, res);
});
