import { initializeApp } from "firebase-admin/app";
import { https, defineSecret } from "firebase-functions/v2";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

initializeApp();

const groqApiKey = defineSecret("GROQ_API_KEY");

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

function getFallbackBuyerReply(message, userName) {
  const msg = (message || "").toLowerCase();
  const name = userName ? ` ${userName}` : "";
  const greetings = ["hi", "hello", "hey", "good day", "greetings"];
  if (greetings.some((g) => msg.includes(g))) {
    return `Hello${name}! Welcome to Bamboo Home Support. I can help you with browsing products, placing orders, tracking deliveries, and more. What would you like to know today?`;
  }
  if (msg.includes("track") || msg.includes("order status") || msg.includes("delivery")) {
    return `Hello${name}! To track your order: 1) Log in to your Bamboo Home account, 2) Go to "Orders" in your account menu, 3) Select the order you want to view, 4) Click "Track Order" to see the live GPS status and courier details. You will also receive SMS or email updates from the seller when the status changes. If you need help with a specific order, please contact the seller directly via Chat or contact an administrator for further assistance.`;
  }
  if (msg.includes("cart") || msg.includes("add") || msg.includes("checkout")) {
    return `Hello${name}! To add items to your cart and check out: 1) Browse products and open a product you like, 2) Adjust the quantity and click "Add to Cart", 3) Open the Cart page from the header, 4) Review your items and click "Proceed to Checkout", 5) Fill in your delivery address, choose your payment method (Cash on Delivery, GCash, Maya, or Card), then confirm the order.`;
  }
  if (msg.includes("contact") || msg.includes("seller") || msg.includes("store")) {
    return `Hello${name}! To contact a seller or view their store: 1) Open any product listing, 2) Click the seller's store name or "View Store" button, 3) Use the Chat button on the store page to send a direct message. If you need further help or have a complaint against a seller, please contact the Bamboo Home administrator.`;
  }
  if (msg.includes("return") || msg.includes("refund") || msg.includes("cancel")) {
    return `Hello${name}! Order cancellations, returns, and refunds are handled per marketplace policy and subject to seller approval. To cancel a pending order: open your Orders page, select the order, and click "Cancel Order" if the option is available. For returns or refunds, please first message the seller via Chat to explain the issue. If you cannot reach an agreement, contact the administrator to review your case.`;
  }
  if (msg.includes("password") || msg.includes("account") || msg.includes("login") || msg.includes("signup") || msg.includes("profile")) {
    return `Hello${name}! For account issues: 1) If you forgot your password, use the "Forgot password" link on the login page to receive a reset email, 2) To update your profile details (name, address, contact), log in and go to your Profile page, 3) If you cannot log in at all, please contact the administrator with your registered email so we can verify your account.`;
  }
  return `Hello${name}! Thank you for reaching out to Bamboo Home Support. I can guide you with product browsing, cart & checkout, order tracking, contacting sellers, account management, and marketplace rules. For urgent help or issues not covered here, please contact the administrator for assistance.`;
}

function getFallbackSellerReply(message, isSuspended, suspensionReason, suspensionTimeRemaining, sellerName, storeName) {
  const name = sellerName || "Seller";
  if (isSuspended) {
    const reason = suspensionReason || "a policy violation";
    const time = suspensionTimeRemaining || "Please check your suspension notice";
    return `Dear ${name}, your store (${storeName || "your store"}) is currently suspended due to ${reason}. Time remaining: ${time}. As an AI assistant, I cannot remove, shorten, or override the suspension — only an authorized Bamboo Home administrator can review or change this decision. To request a review: 1) Read the suspension notice carefully, 2) Correct the issue described, 3) Contact the administrator with a written explanation of what you have fixed. In the meantime, make sure you understand the marketplace rules and prepare evidence of corrective action. Do not attempt to create a new account to bypass the restriction.`;
  }
  const msg = (message || "").toLowerCase();
  if (msg.includes("stock") || msg.includes("inventory")) {
    return `Hi ${name}! To update your inventory or stock levels: 1) Log in to your Seller Dashboard, 2) Go to the Products section, 3) Locate the product you want to update and click Edit (pencil icon), 4) Update the Stock Quantity field and click Save. For multiple products, use the Bulk Edit option if available in your dashboard. Remember to keep your stock accurate so buyers do not order items that are out of stock.`;
  }
  if (msg.includes("product") || msg.includes("list") || msg.includes("add product")) {
    return `Hi ${name}! To add a new product listing: 1) Open your Seller Dashboard, 2) Click "Add Product" or "New Listing", 3) Fill in the product name, description, category, price, stock quantity, and upload clear photos, 4) Click "Save" or "Publish". Good photos, accurate descriptions, and the correct category help buyers find your product faster. For edits, use the Edit button next to an existing listing in your Products section.`;
  }
  if (msg.includes("order") || msg.includes("ship") || msg.includes("deliver")) {
    return `Hi ${name}! To manage your orders: 1) Go to the Orders section in your Seller Dashboard, 2) Review new pending orders promptly, 3) Click "Accept" then update the status to "Preparing" once you start packing, 4) After you hand the item over to the courier, mark it as "Shipped" and enter the tracking number if available, 5) When the buyer receives the item, the order status moves to "Delivered". Always communicate with the buyer via Chat for any delays or questions.`;
  }
  if (msg.includes("analytics") || msg.includes("sales") || msg.includes("report") || msg.includes("insight")) {
    return `Hi ${name}! To view your sales analytics and insights: 1) Open your Seller Dashboard, 2) Go to the Sales Analytics or Reports section, 3) Use the AI Sales Advisor tool (the "Generate Insights" button) for a detailed analysis of your best-selling products, slow-moving stock, inventory alerts, and recommended actions. Review this regularly to restock top performers on time and run promotions for slow sellers.`;
  }
  if (msg.includes("suspend") || msg.includes("warning") || msg.includes("violation") || msg.includes("ban")) {
    return `Hi ${name}! If you received a warning or are at risk of suspension: carefully review the marketplace rules in your dashboard. Common violations include inaccurate listings, not shipping confirmed orders, rude buyer communication, or duplicate accounts. If you have been suspended, I cannot remove the suspension — only an administrator can do that after review. To reduce risk: ship orders on time, respond politely to buyers, keep stock accurate, and contact the administrator immediately if you are unsure about any action.`;
  }
  return `Hi ${name}! Welcome to Bamboo Home Seller Support. I can guide you with product management, inventory, orders & deliveries, analytics, notifications, messaging buyers, store management, and marketplace rules. For anything urgent or decisions involving your account status, please contact the administrator directly.`;
}

function generateFallbackSalesInsights(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return "AI Sales Advisor\n\nNo products available to analyze.";
  }
  const validProducts = products
    .filter((p) => p && (p.name || p.title))
    .map((p) => ({
      name: p.name || p.title || "Unnamed Product",
      sold: Math.max(0, Number(p.sold || p.salesCount || p.soldCount || 0)),
      stock: Math.max(0, Number(p.stock || 0)),
      price: Math.max(0, Number(p.price || 0)),
      category: p.category || "General",
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
  report += `- Total recorded sales: ${totalSalesCount} unit(s) with an estimated revenue of P${totalRevenueEst.toLocaleString("en-US", { minimumFractionDigits: 2 })}.\n\n`;
  report += `Best-Selling Product\n`;
  if (bestSeller && bestSeller.sold > 0) {
    report += `- Top performer: "${bestSeller.name}" with ${bestSeller.sold} unit(s) sold at P${bestSeller.price.toLocaleString()}.\n`;
    report += `- High customer demand. Consider maintaining higher stock levels to prevent stockouts.\n\n`;
  } else {
    report += `- No sales recorded yet across products. Focus on initial promotions and featured listings.\n\n`;
  }
  report += `Slow-Selling Products\n`;
  if (slowSellers.length > 0) {
    const list = slowSellers.slice(0, 3).map((p) => `"${p.name}"`).join(", ");
    report += `- Low activity on ${slowSellers.length} item(s): ${list}.\n`;
    report += `- Recommendation: Review pricing, improve product images, or offer bundle discounts.\n\n`;
  } else {
    report += `- All current items have active sales momentum.\n\n`;
  }
  report += `Inventory Alerts\n`;
  if (outOfStock.length > 0) {
    const outList = outOfStock.map((p) => `"${p.name}"`).join(", ");
    report += `- OUT OF STOCK (${outOfStock.length}): ${outList}. Restock urgently to capture missed demand.\n`;
  }
  if (lowStock.length > 0) {
    const lowList = lowStock.map((p) => `"${p.name}" (${p.stock} remaining)`).join(", ");
    report += `- LOW STOCK (${lowStock.length}): ${lowList}.\n`;
  }
  if (outOfStock.length === 0 && lowStock.length === 0) {
    report += `- Healthy inventory levels across all catalog items.\n`;
  }
  report += `\n`;
  report += `Revenue Opportunities\n`;
  const highMarginItem = [...validProducts].sort((a, b) => b.price - a.price)[0];
  if (highMarginItem) {
    report += `- Feature high-value product "${highMarginItem.name}" (P${highMarginItem.price.toLocaleString()}) on store home banner.\n`;
  }
  report += `- Create product bundles combining best sellers with slow-moving stock to boost average order value.\n\n`;
  report += `Marketing Suggestions\n`;
  report += `- Run limited-time discounts on slow sellers to clear stagnant inventory.\n`;
  report += `- Showcase best-selling items on your storefront banner and social media.\n`;
  report += `- Consider seasonal promotions aligned with demand spikes for bamboo furniture.\n\n`;
  report += `Recommended Actions\n`;
  report += `- 1. Immediately restock items marked low or out-of-stock.\n`;
  report += `- 2. Run promotional discounts or spotlight campaigns for slow-moving products.\n`;
  report += `- 3. Keep store contact details and barangay delivery locations updated.\n`;
  report += `- 4. Respond promptly to buyer messages and ship confirmed orders on time.`;
  return report;
}

const app = express();
app.use(cors());
app.use(express.json());

let groq;
try {
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey) {
    groq = new Groq({ apiKey });
  }
} catch (e) {
  console.warn("Could not initialize Groq SDK. Check API key configuration.");
}

app.post("/api/buyer-support", async (req, res) => {
  try {
    const message = req.body?.message;
    const userName = req.body?.userName || "";
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid message.",
      });
    }

    if (groq) {
      try {
        const systemPrompt = `
You are the official AI Buyer Support Assistant for Bamboo Home, a multi-vendor bamboo furniture marketplace.

Help buyers understand how to use the platform.

You may provide guidance about:
- Browsing and searching products
- Adding products to cart
- Placing orders
- Checking out
- Tracking orders
- Contacting sellers
- Viewing seller stores
- Viewing order history
- Managing profile
- Marketplace rules

Important rules:
- Do not claim to directly change Firebase data.
- Do not claim to approve, cancel, or update orders.
- Do not pretend to be an administrator.
- Do not invent Bamboo Home features.
- Give step-by-step guidance when appropriate.
- Keep the response clear, professional, and concise.
- Do not use emojis.
- When uncertain about a system feature, tell the buyer to contact the administrator.
        `.trim();

        const messages = [
          { role: "system", content: systemPrompt },
          ...history.map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: item.content || "",
          })),
          { role: "user", content: message.trim() },
        ];

        const completion = await createChatCompletionWithFallback(groq, {
          messages,
          temperature: 0.35,
          max_completion_tokens: 600,
        });

        const reply =
          completion.choices?.[0]?.message?.content ||
          getFallbackBuyerReply(message, userName);

        return res.json({ success: true, reply });
      } catch (aiErr) {
        console.warn("Buyer support AI call failed, using local fallback:", aiErr?.message || aiErr);
      }
    }

    const reply = getFallbackBuyerReply(message, userName);
    return res.json({ success: true, reply });
  } catch (error) {
    console.error("Buyer support error:", error);
    const reply = getFallbackBuyerReply(req.body?.message || "", req.body?.userName || "");
    return res.json({ success: true, reply });
  }
});

app.post("/api/seller-support", async (req, res) => {
  try {
    const message = req.body?.message;
    const isSuspended = req.body?.isSuspended === true;
    const suspensionReason = req.body?.suspensionReason || "";
    const suspensionTimeRemaining = req.body?.suspensionTimeRemaining || "";
    const sellerName = req.body?.sellerName || "";
    const storeName = req.body?.storeName || "";
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid message.",
      });
    }

    if (groq) {
      try {
        const systemPrompt = isSuspended
          ? `
You are the official AI Seller Support Assistant for Bamboo Home.

The seller's account is currently suspended.

Seller name:
${sellerName || "Not provided"}

Store name:
${storeName || "Not provided"}

Suspension reason:
${suspensionReason || "No specific reason provided"}

Suspension time remaining:
${suspensionTimeRemaining || "Unknown"}

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
          `.trim();

        const messages = [
          { role: "system", content: systemPrompt },
          ...history.map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: item.content || "",
          })),
          { role: "user", content: message.trim() },
        ];

        const completion = await createChatCompletionWithFallback(groq, {
          messages,
          temperature: 0.35,
          max_completion_tokens: 600,
        });

        const reply =
          completion.choices?.[0]?.message?.content ||
          getFallbackSellerReply(message, isSuspended, suspensionReason, suspensionTimeRemaining, sellerName, storeName);

        return res.json({ success: true, reply });
      } catch (aiErr) {
        console.warn("Seller support AI call failed, using local fallback:", aiErr?.message || aiErr);
      }
    }

    const reply = getFallbackSellerReply(message, isSuspended, suspensionReason, suspensionTimeRemaining, sellerName, storeName);
    return res.json({ success: true, reply });
  } catch (error) {
    console.error("Seller support error:", error);
    const reply = getFallbackSellerReply(
      req.body?.message || "",
      req.body?.isSuspended === true,
      req.body?.suspensionReason || "",
      req.body?.suspensionTimeRemaining || "",
      req.body?.sellerName || "",
      req.body?.storeName || ""
    );
    return res.json({ success: true, reply });
  }
});

app.post("/api/sales-insights", async (req, res) => {
  try {
    const products = req.body?.products;
    const mostSoldProductFallback =
      Array.isArray(products) && products.length > 0
        ? [...products].sort(
            (a, b) => Math.max(0, Number(b?.sold || 0)) - Math.max(0, Number(a?.sold || 0))
          )[0] || null
        : null;

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
        category: product.category || "Unknown",
        estimatedRevenue: Math.max(0, Number(product.sold) || 0) * Math.max(0, Number(product.price) || 0),
      }));

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid product data was provided.",
      });
    }

    const sortedProducts = [...validProducts].sort((a, b) => b.sold - a.sold);
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

    if (groq) {
      try {
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
          completion.choices?.[0]?.message?.content?.trim() ||
          generateFallbackSalesInsights(products);

        return res.json({
          success: true,
          mostSoldProduct: mostSoldProduct || mostSoldProductFallback,
          reply,
        });
      } catch (aiErr) {
        console.warn("Sales insights AI call failed, using local fallback:", aiErr?.message || aiErr);
      }
    }

    const reply = generateFallbackSalesInsights(products);
    return res.json({
      success: true,
      mostSoldProduct: mostSoldProduct || mostSoldProductFallback,
      reply,
    });
  } catch (error) {
    console.error("Sales insights error:", error);
    const reply = generateFallbackSalesInsights(req.body?.products || []);
    return res.json({
      success: true,
      mostSoldProduct: mostSoldProductFallbackFrom(req.body?.products),
      reply,
    });
  }
});

function mostSoldProductFallbackFrom(products) {
  if (!Array.isArray(products) || products.length === 0) return null;
  return [...products].sort(
    (a, b) => Math.max(0, Number(b?.sold || 0)) - Math.max(0, Number(a?.sold || 0))
  )[0] || null;
}

export const api = https.onRequest({ secrets: [groqApiKey] }, async (req, res) => {
  if (!groq) {
    try {
      const apiKey = groqApiKey.value();
      if (apiKey) {
        groq = new Groq({ apiKey });
      }
    } catch (e) {
      console.warn("Could not read GROQ_API_KEY from Firebase Secrets; relying on local fallback replies only.");
    }
  }
  return app(req, res);
});
