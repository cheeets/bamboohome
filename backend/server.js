import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, ".env") });

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

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.warn("GROQ_API_KEY not set — AI endpoints are disabled.");
}



app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://127.0.0.1:5173',
        'https://bamboo-home.web.app',
      ];

      if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bamboo Home AI server is running.",
  });
});

app.post("/api/buyer-support", async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({
        success: false,
        error: "The AI support assistant is temporarily disabled (GROQ_API_KEY missing).",
      });
    }

    const message = req.body?.message;
    const userName = req.body?.userName || '';
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid message.',
      });
    }

    const systemPrompt = `
You are the official AI Customer Support Assistant for Bamboo Home, a premier bamboo furniture and home decor marketplace.

Customer Name:
${userName || 'Valued Customer'}

Help buyers with:
- Finding bamboo products, categories, and custom crafts
- How to browse, add to cart, and place orders
- Payment options (Cash on Delivery, GCash, Maya, Card)
- Order tracking and live GPS status updates
- How to contact store sellers directly via Chat
- Account management and platform features

Guidelines:
- Be polite, helpful, clear, and concise.
- Provide step-by-step instructions when guiding buyers.
- Do not claim to directly modify order status or make payments on behalf of users.
- Do not use emojis.
    `.trim();

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
    ];

    const completion = await createChatCompletionWithFallback(groq, {
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
    console.error("Buyer support error:", error);

    res.status(500).json({
      success: false,
      error: "The AI support assistant is temporarily unavailable.",
    });
  }
});

app.post("/api/seller-support", async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({
        success: false,
        error: "The AI support assistant is temporarily disabled (GROQ_API_KEY missing).",
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

    const completion = await createChatCompletionWithFallback(groq, {
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
      return res.status(503).json({
        success: false,
        error: "The AI sales advisor is temporarily disabled (GROQ_API_KEY missing).",
      });
    }

    const products = req.body?.products;
    console.log(`Received sales insights request with ${Array.isArray(products) ? products.length : 0} products`);

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No product data was provided.",
      });
    }

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
    console.error("Sales insights error:", error?.stack || error);

    const errorMessage = process.env.NODE_ENV === 'production'
      ? "The AI sales analysis is temporarily unavailable."
      : error?.message || "Unexpected server error.";

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

app.post("/api/create-gcash-checkout", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid payment amount." });
    }

    const simulatedRef = 'GCASH-REF-' + Math.floor(100000000000 + Math.random() * 900000000000);
    return res.json({
      success: true,
      gateway: 'GCash Express Gateway',
      referenceNumber: simulatedRef,
      paymentStatus: 'Paid Online (GCash)',
      message: 'GCash online payment authorized successfully.',
    });
  } catch (error) {
    console.error("GCash Checkout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unable to initialize GCash payment session.",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API route not found.",
  });
});

app.listen(PORT, () => {
  console.log(`Bamboo Home backend is running on http://localhost:${PORT}`);
});