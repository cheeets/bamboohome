import Groq from "groq-sdk";

const MODEL_FALLBACK_CHAIN = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "groq/compound",
  "groq/compound-mini",
];

const SELLER_FALLBACK_KNOWLEDGE = [
  {
    keywords: ['add product', 'create product', 'new listing', 'upload'],
    answer: `To add a new product to your store:
1. In your Seller Dashboard sidebar click Products then + Add Product.
2. Fill in: product name, description, clear photo, unit price, stock on hand, and category.
3. Optional: set a low stock threshold so you receive warnings before you run out.
Your listing appears on the marketplace immediately (unless your seller account is suspended or deleted). Keep photos bright and crop to square for best results.`
  },
  {
    keywords: ['stock', 'inventory', 'update stock', 'quantity'],
    answer: `Ways to update stock:
1. Seller Dashboard → Products → click Edit on a product and change the stock number.
2. Or directly edit the stock number in the product list table and press Tab / click away — it saves on blur.
3. You can also use the Admin Global Inventory page if you're an admin moderating the catalog.
Set a low-stock threshold (default 5) so the dashboard flags you with Low Stock warnings before stockouts happen.`
  },
  {
    keywords: ['order', 'accept', 'process', 'pending', 'ship', 'deliver', 'reject'],
    answer: `Seller order flow in Bamboo Home:
1. PENDING orders appear at the top of your Seller Dashboard → Orders panel.
   - Reject (optional) if you can't fulfill — the buyer is notified automatically.
2. Start Processing — click "Start Processing" once you accept the order.
   (Bamboo Home order flow is: Pending → Process → Shipped → Delivered.)
3. When your delivery rider is on the way, click Mark as Shipped.
4. Once the buyer receives the item and pays, click Mark Delivered.
At every status change, the buyer gets a live notification via the notification bell.`
  },
  {
    keywords: ['analytics', 'sales', 'revenue', 'insights', 'report'],
    answer: `Understand your sales analytics:
- Seller Dashboard → Analytics → Sales Trend chart for 30 days, 12 months, or by year.
- Revenue by Product pie chart highlights what's earning you the most.
- The Generate Insights button produces a tailored AI report with best seller, slow sellers, inventory alerts, and next actions.
- Orders count only shows orders with at least 1 current product item; orders containing items you later deleted are excluded from totals so your metrics stay accurate.`
  },
  {
    keywords: ['not visible', 'not showing', 'hidden', 'buyer can\'t see', 'missing product'],
    answer: `Why a product may not be visible to buyers:
1. Seller account is deleted — products from deleted sellers are hidden everywhere.
2. Seller account is currently suspended (check your Seller Dashboard header for the suspension banner and countdown).
3. Product stock = 0 shows Sold Out overlay but still appears; refresh or re-list by increasing stock.
4. The product was marked deleted by you or an admin (check Recycle Bin in Admin).
Buyers always see the exact same marketplace set — our catalog pages now filter out deleted and suspended stores for consistency.`
  },
  {
    keywords: ['suspend', 'suspended', 'ban', 'violation', 'warning'],
    answer: `If your account is suspended:
1. A red banner appears at the top of your Seller Dashboard with the reason and a live countdown.
2. Your store and all products are temporarily hidden from buyers during the suspension.
3. You cannot remove the suspension by yourself.
4. To request a review or clarification: message the admin through your buyer account Chat, or send the store name and order references to the administrator.
Always read Bamboo Home seller rules to avoid future violations — common ones are non-delivery, misleading listings, and ignoring buyer messages for 48+ hours.`
  },
  {
    keywords: ['improve sales', 'more sales', 'sell more', 'marketing', 'promote'],
    answer: `Proven ways to improve your bamboo furniture sales:
1. Feature your top 3 best sellers with high-quality square photos on a white background.
2. Respond to buyer Chat messages within 1 hour — fast response rates correlate to 2x higher sales.
3. Keep stock above the low threshold — stockouts cost you buyers.
4. Offer bundle pricing (e.g. Dining Table + 4 Chairs) in your product descriptions.
5. Ask happy buyers to rate your store — 4.7+ star stores get featured placement.
6. Run a limited-time weekend promo or free delivery within Pinamungajan.
The AI Sales Insights button can also generate a personalized plan from your real store data.`
  },
  {
    keywords: ['message', 'buyer message', 'chat', 'reply'],
    answer: `Seller messaging:
1. Use the Messages section in your Seller Dashboard sidebar.
2. You'll see all active buyer chats sorted by newest.
3. Reply promptly — buyers on Bamboo Home are often asking about custom sizes or delivery dates for handcrafted items.
4. For custom orders, confirm dimensions, price, and lead time in writing inside the chat so both sides have a record before you start crafting.`
  },
  {
    keywords: ['delete product', 'remove listing', 'unpublish'],
    answer: `Deleting a product:
1. Seller Dashboard → Products → click the trash icon for the product.
2. Orders in Pending/Processing/Shipped/Accepted state that contain this product will be automatically Cancelled and the buyer is notified that the item is no longer available.
3. The product is soft-deleted and can be restored from the Admin Recycle Bin within 30 days; after that an admin can permanently erase it.
This protects buyers from paying for items you no longer have in stock.`
  },
];

const SUSPENDED_SELLER_FALLBACK_KNOWLEDGE = [
  {
    keywords: ['why suspended', 'why banned', 'reason'],
    answer: `Common suspension reasons in Bamboo Home:
- Repeatedly missing agreed delivery windows without notifying the buyer.
- Product descriptions or photos that are misleading vs the real item delivered.
- Not responding to buyer messages for 48+ hours for an active order.
- Multiple verified store reports from buyers.
- Platform rules violation (counterfeit listings, outside payments, etc).
The exact reason for *your* suspension appears in the red banner at the top of your Seller Dashboard.`
  },
  {
    keywords: ['how long', 'time remaining', 'when end', 'expire', 'duration'],
    answer: `Suspension duration: look at the live countdown timer displayed on your Seller Dashboard header, or in your account card.
- If the timer says "Expired" but you still see the suspension banner, log out and back in — the suspension should auto-lift when the timer reaches 0.
- If no end date is shown (indefinite suspension) you must request review from an administrator.
The AI cannot shorten or override any suspension period set by an admin.`
  },
  {
    keywords: ['request review', 'appeal', 'review', 'reconsider'],
    answer: `How to request a suspension review:
1. Compile: your seller store name, the order numbers or case references, and a short explanation of what you will change.
2. Contact a Bamboo Home administrator through an alternate buyer account's Chat, or email the registered platform admin.
3. Cooperate — for a first-time offense you may receive a warning instead of a full re-suspension.
4. Wait for an admin decision; do not create a second seller account to bypass a suspension — that is a permanent violation.`
  },
  {
    keywords: ['remove suspension', 'end suspension', 'unsuspend', 'lift'],
    answer: `The AI assistant CANNOT remove, shorten, or override your suspension. Only an authorized Bamboo Home administrator can review and change a suspension after you submit a request.
What you CAN do right now:
1. Fix whatever issue caused the suspension (message back all pending buyers, update misleading listings, set proper stock counts).
2. Document the steps you've taken.
3. Ask an admin for a review as described under "request review" topic.
If your countdown timer reaches 0, the suspension is automatically lifted and your products become visible again without any action from you or the AI.`
  },
  {
    keywords: ['what to do', 'while suspended', 'what can i do'],
    answer: `Productive things to do while suspended:
1. Audit all your current listings — ensure descriptions are accurate, stock numbers are real, and photos are recent.
2. Craft your written appeal with timestamps, screenshots, and commitments you will keep going forward.
3. Prepare — once unsuspended, buyers can order immediately, so make sure you have packaging, delivery contacts, and materials ready.
4. Read or re-read Bamboo Home marketplace rules to avoid repeat violations.
You will not receive new orders while suspended, so use the time to improve the store.`
  },
  {
    keywords: ['avoid', 'prevent', 'future violation', 'not again'],
    answer: `To avoid future suspensions:
- Accept or reject orders within 24 hours.
- Set stock counts accurately — overselling and cancelling is the #1 trigger.
- Reply to every buyer message, even a quick "Got it, I'll check and revert today."
- Deliver on the date you implicitly agree to — if something breaks or material is delayed, notify the buyer proactively through chat, not silence.
- Ship what you listed exactly; substitutions without buyer consent are a reportable offense.
Following these consistently means you will almost never see a suspension.`
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

function cannedSellerReply({ message, isSuspended, suspensionReason, suspensionTimeRemaining, sellerName, storeName }) {
  const name = sellerName ? ` ${sellerName}` : '';
  const store = storeName ? ` Store: "${storeName}"` : '';
  let header;
  let library = SELLER_FALLBACK_KNOWLEDGE;
  if (isSuspended) {
    library = SUSPENDED_SELLER_FALLBACK_KNOWLEDGE;
    header =
      `Hi${name} — I'm currently working in resilient-mode for your suspended seller account${store}.
Suspension reason: ${suspensionReason || 'No specific reason provided in your profile.'}
Suspension time remaining: ${suspensionTimeRemaining || 'Countdown unavailable — please check your dashboard header.'}

I can explain the suspension reason, the remaining countdown, marketplace rules, how to request a review, how to contact admin, and how to avoid repeats.
I CANNOT remove the suspension — only an administrator can.`;
  } else {
    header =
      `Hi${name} — I'm running in resilient-mode for your seller account${store} right now using a built-in operations guide.

Topics I can help with: adding products, updating stock, processing orders (Pending → Process → Shipped → Delivered), sales analytics, why a product isn't visible to buyers, messaging buyers, deleting products, and how to improve sales.
Ask a short question like "Why isn't my product showing?" or "How do I process an order?"`;
  }
  return pickKeywordFallback(message, library, header);
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

  const makeFallback = () => cannedSellerReply({
    message: message.trim(),
    isSuspended,
    suspensionReason,
    suspensionTimeRemaining,
    sellerName,
    storeName,
  });

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        fallback: true,
        reply: makeFallback(),
      });
    }

    const groq = new Groq({ apiKey });

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
      makeFallback();

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Seller support error (falling back to canned):", error?.message || error);

    res.json({
      success: true,
      fallback: true,
      reply: makeFallback(),
    });
  }
}