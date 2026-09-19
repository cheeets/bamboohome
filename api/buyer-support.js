import Groq from "groq-sdk";

const MODEL_FALLBACK_CHAIN = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "groq/compound",
  "groq/compound-mini",
];

const BUYER_FALLBACK_KNOWLEDGE = [
  {
    keywords: ['order', 'place', 'checkout', 'buy', 'purchase', 'how to order'],
    answer: `You can order in a few simple steps:
1. Browse the Shop and click a product to view details.
2. Select quantity and click Add to Cart.
3. Open your Cart and proceed to Checkout.
4. Fill in your delivery address and choose a payment method (Cash on Delivery, GCash, Maya, or Card).
5. Review and confirm your order.
You will receive a notification and can track your order live in the Orders page. If you need help, use the Chat page to message the seller directly.`
  },
  {
    keywords: ['contact', 'message', 'chat', 'seller', 'talk'],
    answer: `To contact a store seller:
1. Open the product or click the store name.
2. Click the orange Message button below the store header.
3. Or go to the Chat page in the sidebar and select the seller's store.
Messages are delivered live and the seller will reply in-app. You can also ask for custom-sized bamboo furniture through chat.`
  },
  {
    keywords: ['track', 'delivery', 'gps', 'map', 'where is my order', 'status'],
    answer: `Tracking your order is automatic:
1. Go to the Orders page from the buyer sidebar.
2. Open your order — the status shows Pending → Accepted → Processing → Shipped → Delivered.
3. Once shipped, tap the Delivery Tracker button to open the live GPS map showing the driver's route to your address in Pinamungajan.
Timeline updates and seller notifications are delivered live via the notification bell.`
  },
  {
    keywords: ['payment', 'gcash', 'pay', 'may', 'card', 'cod', 'cash'],
    answer: `Supported payment methods:
- Cash On Delivery (COD) — pay in cash when the items arrive at your home.
- GCash — pay online using your GCash wallet during checkout. A reference number is generated for your records.
- Maya and card payments are also accepted through the same secure checkout flow.
All online payments show as Paid Online (GCash) on your order and seller dashboard.`
  },
  {
    keywords: ['profile', 'update', 'edit account', 'change name', 'change number'],
    answer: `To update your account and profile:
1. Go to the Profile page in the buyer sidebar.
2. You can edit your display name, contact number, and default delivery address.
3. If you need to change your registered email, contact an administrator through store messaging.
Keep your delivery address and contact number up to date so drivers can easily find you on delivery day.`
  },
  {
    keywords: ['cart', 'remove', 'quantity', 'update cart'],
    answer: `Managing your cart:
- Click the cart icon at any time to view your items.
- Adjust quantity with the +/- buttons next to each product.
- Use the Remove link to delete an item.
- The subtotal and total update live.
When you're ready, click Proceed to Checkout. Note that carts are separate per buyer and stored in your account.`
  },
  {
    keywords: ['product', 'browse', 'find', 'search', 'filter', 'category'],
    answer: `How to find products:
- Visit the Shop page.
- Use the search box at the top to look for a product or store by name.
- Use the category chips (Chairs, Tables, Beds, Home Decor) to filter.
- Use the All Stores dropdown to shop from a specific artisan.
- Use the Sort menu to order by newest, highest rating, or price.
All products are made from natural bamboo and ship from local Pinamungajan artisans.`
  },
  {
    keywords: ['rate', 'review', 'feedback', 'star', 'rating'],
    answer: `To rate a store or product:
1. Go to a seller's store page via the Shop or via the seller link in your completed order.
2. Click the 5 stars under the seller store header and select your rating.
3. You must be logged in as a buyer (user role) to rate. You cannot rate your own store.
Ratings help other buyers choose trusted artisans and help sellers improve their craft.`
  },
  {
    keywords: ['refund', 'return', 'exchange', 'cancel', 'damaged'],
    answer: `Order issues:
- Cancel: you can cancel a Pending order before the seller accepts it.
- Returns/exchanges: contact the seller directly via Chat — for custom crafted bamboo furniture we recommend discussing the issue with the seller first.
- Damaged on delivery: take a photo upon receipt and message the seller within 24 hours together with your order number so they can arrange a resolution.
If a fair resolution cannot be reached, report the store and an administrator will review the case.`
  },
];

function pickKeywordFallback(question, library, defaultReply) {
  const normalized = (question || '').toString().toLowerCase();
  if (!normalized) return defaultReply;
  for (const entry of library) {
    for (const kw of entry.keywords) {
      if (normalized.includes(kw)) return entry.answer;
    }
  }
  return defaultReply;
}

function cannedBuyerReply(message, userName) {
  const name = userName ? ` ${userName}` : '';
  const defaultReply =
    `Hi${name} — I'm running with a built-in help guide right now.

Quick questions I can answer: How to order, how to contact a seller, how to track delivery, payment methods, updating your profile, managing your cart, browsing and filtering, ratings and reviews, and returns or refunds.

Type a short question (example: "How do I pay with GCash?") and I'll give you the step-by-step guide. If you need human help, contact a Bamboo Home administrator via the Chat page or message the seller store directly.`;
  return pickKeywordFallback(message, BUYER_FALLBACK_KNOWLEDGE, defaultReply);
}

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

export default async function handler(req, res) {
  // Set CORS headers to allow all origins for mobile compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const message = req.body?.message;
  const userName = req.body?.userName || '';

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid message.',
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        fallback: true,
        reply: cannedBuyerReply(message, userName),
      });
    }

    const groq = new Groq({ apiKey });
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

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
        `.trim()

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content || '',
      })),
      { role: 'user', content: message.trim() },
    ]

    const completion = await createChatCompletionWithFallback(groq, {
      messages,
      temperature: 0.35,
      max_completion_tokens: 600,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      cannedBuyerReply(message, userName);

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Buyer support error (falling back to canned):", error?.message || error);

    res.json({
      success: true,
      fallback: true,
      reply: cannedBuyerReply(message, userName),
    });
  }
}
