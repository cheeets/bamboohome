const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '';
  return envUrl.replace(/\/$/, '');
};

const BUYER_FALLBACK_KNOWLEDGE = [
  {
    keywords: ['order', 'place', 'checkout', 'buy', 'purchase', 'how to order'],
    answer:
      `You can order in a few simple steps:
1. Browse the Shop and click a product to view details.
2. Select quantity and click Add to Cart.
3. Open your Cart and proceed to Checkout.
4. Fill in your delivery address and choose a payment method (Cash on Delivery, GCash, Maya, or Card).
5. Review and confirm your order.
You will receive a notification and can track your order live in the Orders page. If you need help, use the Chat page to message the seller directly.`
  },
  {
    keywords: ['contact', 'message', 'chat', 'seller', 'talk'],
    answer:
      `To contact a store seller:
1. Open the product or click the store name.
2. Click the orange Message button below the store header.
3. Or go to the Chat page in the sidebar and select the seller's store.
Messages are delivered live and the seller will reply in-app. You can also ask for custom-sized bamboo furniture through chat.`
  },
  {
    keywords: ['track', 'delivery', 'gps', 'map', 'where is my order', 'status'],
    answer:
      `Tracking your order is automatic:
1. Go to the Orders page from the buyer sidebar.
2. Open your order — the status shows Pending → Accepted → Processing → Shipped → Delivered.
3. Once shipped, tap the Delivery Tracker button to open the live GPS map showing the driver's route to your address in Pinamungajan.
Timeline updates and seller notifications are delivered live via the notification bell.`
  },
  {
    keywords: ['payment', 'gcash', 'pay', 'may', 'card', 'cod', 'cash'],
    answer:
      `Supported payment methods:
- Cash On Delivery (COD) — pay in cash when the items arrive at your home.
- GCash — pay online using your GCash wallet during checkout. A reference number is generated for your records.
- Maya and card payments are also accepted through the same secure checkout flow.
All online payments show as Paid Online (GCash) on your order and seller dashboard.`
  },
  {
    keywords: ['profile', 'update', 'edit account', 'change name', 'change number'],
    answer:
      `To update your account and profile:
1. Go to the Profile page in the buyer sidebar.
2. You can edit your display name, contact number, and default delivery address.
3. If you need to change your registered email, contact an administrator through store messaging.
Keep your delivery address and contact number up to date so drivers can easily find you on delivery day.`
  },
  {
    keywords: ['cart', 'remove', 'quantity', 'update cart'],
    answer:
      `Managing your cart:
- Click the cart icon at any time to view your items.
- Adjust quantity with the +/- buttons next to each product.
- Use the Remove link to delete an item.
- The subtotal and total update live.
When you're ready, click Proceed to Checkout. Note that carts are separate per buyer and stored in your account.`
  },
  {
    keywords: ['product', 'browse', 'find', 'search', 'filter', 'category'],
    answer:
      `How to find products:
- Visit the Shop page.
- Use the search box at the top to look for a product or store by name.
- Use the category chips (e.g. Chairs, Tables, Beds, Home Decor) to filter.
- Use the All Stores dropdown to shop from a specific artisan.
- Use the Sort menu to order by newest, highest rating, or price.
All products are made from natural bamboo and ship from local Pinamungajan artisans.`
  },
  {
    keywords: ['rate', 'review', 'feedback', 'star', 'rating'],
    answer:
      `To rate a store or product:
1. Go to a seller's store page via the Shop or via the seller link in your completed order.
2. Click the 5 stars under the seller store header and select your rating.
3. You must be logged in as a buyer (user role) to rate. You cannot rate your own store.
Ratings help other buyers choose trusted artisans and help sellers improve their craft.`
  },
  {
    keywords: ['refund', 'return', 'exchange', 'cancel', 'damaged'],
    answer:
      `Order issues:
- Cancel: you can cancel a Pending order before the seller accepts it.
- Returns/exchanges: contact the seller directly via Chat — for custom crafted bamboo furniture we recommend discussing the issue with the seller first.
- Damaged on delivery: take a photo upon receipt and message the seller within 24 hours together with your order number so they can arrange a resolution.
If a fair resolution cannot be reached, report the store and an administrator will review the case.`
  },
];

const SELLER_FALLBACK_KNOWLEDGE = [
  {
    keywords: ['add product', 'create product', 'new listing', 'upload'],
    answer:
      `To add a new product to your store:
1. In your Seller Dashboard sidebar click Products then + Add Product.
2. Fill in: product name, description, clear photo, unit price, stock on hand, and category.
3. Optional: set a low stock threshold so you receive warnings before you run out.
Your listing appears on the marketplace immediately (unless your seller account is suspended or deleted). Keep photos bright and crop to square for best results.`
  },
  {
    keywords: ['stock', 'inventory', 'update stock', 'quantity'],
    answer:
      `Ways to update stock:
1. Seller Dashboard → Products → click Edit on a product and change the stock number.
2. Or directly edit the stock number in the product list table and press Tab / click away — it saves on blur.
3. You can also use the Admin Global Inventory page if you're an admin moderating the catalog.
Set a low-stock threshold (default 5) so the dashboard flags you with Low Stock warnings before stockouts happen.`
  },
  {
    keywords: ['order', 'accept', 'process', 'pending', 'ship', 'deliver', 'reject'],
    answer:
      `Seller order flow in Bamboo Home:
1. PENDING orders appear at the top of your Seller Dashboard → Orders panel.
   - Reject (optional) if you can't fulfill — the buyer is notified automatically.
2. Start Processing — click "Start Processing" once you accept the order.
   (Important: Bamboo Home does not have a separate Accept button — the flow is: Pending → Process → Shipped → Delivered.)
3. When your delivery rider is on the way, click Mark as Shipped.
4. Once the buyer receives the item and pays, click Mark Delivered.
At every status change, the buyer gets a live notification via the notification bell.`
  },
  {
    keywords: ['analytics', 'sales', 'revenue', 'insights', 'report'],
    answer:
      `Understand your sales analytics:
- Seller Dashboard → Analytics → Sales Trend chart for 30 days, 12 months, or by year.
- Revenue by Product pie chart highlights what's earning you the most.
- The Generate Insights button produces a tailored AI report with best seller, slow sellers, inventory alerts, and next actions.
- Orders count only shows orders with at least 1 current product item; orders containing items you later deleted are excluded from totals so your metrics stay accurate.`
  },
  {
    keywords: ['not visible', 'not showing', 'hidden', 'buyer can\'t see', 'missing product'],
    answer:
      `Why a product may not be visible to buyers:
1. Seller account is deleted — products from deleted sellers are hidden everywhere.
2. Seller account is currently suspended (check your Seller Dashboard header for the suspension banner and countdown).
3. Product stock = 0 shows Sold Out overlay but still appears; refresh or re-list by increasing stock.
4. The product was marked deleted by you or an admin (check Recycle Bin in Admin).
Buyers always see the exact same marketplace set — our catalog pages now filter out deleted and suspended stores for consistency.`
  },
  {
    keywords: ['suspend', 'suspended', 'ban', 'violation', 'warning'],
    answer:
      `If your account is suspended:
1. A red banner appears at the top of your Seller Dashboard with the reason and a live countdown.
2. Your store and all products are temporarily hidden from buyers during the suspension.
3. You cannot remove the suspension by yourself.
4. To request a review or clarification: message the admin through your buyer account Chat, or send the store name and order references to the administrator.
Always read Bamboo Home seller rules to avoid future violations — common ones are non-delivery, misleading listings, and ignoring buyer messages for 48+ hours.`
  },
  {
    keywords: ['improve sales', 'more sales', 'sell more', 'marketing', 'promote'],
    answer:
      `Proven ways to improve your bamboo furniture sales:
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
    answer:
      `Seller messaging:
1. Use the Messages section in your Seller Dashboard sidebar.
2. You'll see all active buyer chats sorted by newest.
3. Reply promptly — buyers on Bamboo Home are often asking about custom sizes or delivery dates for handcrafted items.
4. For custom orders, confirm dimensions, price, and lead time in writing inside the chat so both sides have a record before you start crafting.`
  },
  {
    keywords: ['delete product', 'remove listing', 'unpublish'],
    answer:
      `Deleting a product:
1. Seller Dashboard → Products → click the trash icon for the product.
2. Orders in Pending/Processing/Shipped/Accepted state that contain this product will be automatically Cancelled and the buyer is notified that the item is no longer available.
3. The product is soft-deleted and can be restored from the Admin Recycle Bin within 30 days; after that an admin can permanently erase it.
This protects buyers from paying for items you no longer have in stock.`
  },
];

const SUSPENDED_SELLER_FALLBACK_KNOWLEDGE = [
  {
    keywords: ['why suspended', 'why banned', 'reason'],
    answer:
      `Common suspension reasons in Bamboo Home:
- Repeatedly missing agreed delivery windows without notifying the buyer.
- Product descriptions or photos that are misleading vs the real item delivered.
- Not responding to buyer messages for 48+ hours for an active order.
- Multiple verified store reports from buyers.
- Platform rules violation (counterfeit listings, outside payments, etc).
The exact reason for *your* suspension appears in the red banner at the top of your Seller Dashboard. The AI cannot invent or add a reason.`
  },
  {
    keywords: ['how long', 'time remaining', 'when end', 'expire', 'duration'],
    answer:
      `Suspension duration: look at the live countdown timer displayed on your Seller Dashboard header, or in your account card.
- If the timer says "Expired" but you still see the suspension banner, log out and back in — the suspension should auto-lift when the timer reaches 0 and the marketplace rules re-check your account.
- If no end date is shown (indefinite suspension) you must request review from an administrator.
The AI cannot shorten or override any suspension period set by an admin.`
  },
  {
    keywords: ['request review', 'appeal', 'review', 'reconsider'],
    answer:
      `How to request a suspension review:
1. Compile: your seller store name, the order numbers or case references, and a short explanation of what you will change.
2. Contact a Bamboo Home administrator through an alternate buyer account's Chat, or email the registered platform admin.
3. Cooperate — for a first-time offense you may receive a warning instead of a full re-suspension.
4. Wait for an admin decision; do not create a second seller account to bypass a suspension — that is a permanent violation.`
  },
  {
    keywords: ['remove suspension', 'end suspension', 'unsuspend', 'lift'],
    answer:
      `The AI assistant CANNOT remove, shorten, or override your suspension. Only an authorized Bamboo Home administrator can review and change a suspension after you submit a request.
What you CAN do right now:
1. Fix whatever issue caused the suspension (for example message back all pending buyers, update misleading listings, set proper stock counts).
2. Document the steps you've taken.
3. Ask an admin for a review as described under "request review" topic.
If your countdown timer reaches 0, the suspension is automatically lifted and your products become visible again without any action from you or the AI.`
  },
  {
    keywords: ['what to do', 'while suspended', 'what can i do'],
    answer:
      `Productive things to do while suspended:
1. Audit all your current listings — ensure descriptions are accurate, stock numbers are real, and photos are recent.
2. Craft your written appeal with timestamps, screenshots, and commitments you will keep going forward.
3. Prepare — once unsuspended, buyers can order immediately, so make sure you have packaging, delivery contacts, and materials ready.
4. Read or re-read Bamboo Home marketplace rules to avoid repeat violations.
You will not receive new orders while suspended, so use the time to improve the store.`
  },
  {
    keywords: ['avoid', 'prevent', 'future violation', 'not again'],
    answer:
      `To avoid future suspensions:
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
      if (normalized.includes(kw)) {
        return entry.answer;
      }
    }
  }
  return defaultReply;
}

function fallbackBuyerReply(message, userName) {
  const name = userName ? ` ${userName}` : '';
  const defaultReply =
    `Hi${name} — I'm running in offline mode right now so I'm using my built-in help guide to assist you.

Quick questions I can answer: How to order, how to contact a seller, how to track delivery, payment methods, updating your profile, managing your cart, browsing and filtering, ratings and reviews, and returns or refunds.

Type a short question (example: "How do I pay with GCash?") and I'll give you the step-by-step guide. If you need human help, contact a Bamboo Home administrator via the Chat page or message the seller store directly.`;
  return pickKeywordFallback(message, BUYER_FALLBACK_KNOWLEDGE, defaultReply);
}

function fallbackSellerReply({ message, isSuspended, suspensionReason, suspensionTimeRemaining, sellerName, storeName }) {
  const name = sellerName ? ` ${sellerName}` : '';
  const store = storeName ? ` Store: "${storeName}"` : '';
  let header;
  let library = SELLER_FALLBACK_KNOWLEDGE;
  if (isSuspended) {
    library = SUSPENDED_SELLER_FALLBACK_KNOWLEDGE;
    header =
      `Hi${name} — I'm currently working offline for your suspended seller account${store}.
Suspension reason: ${suspensionReason || 'No specific reason provided in your profile.'}
Suspension time remaining: ${suspensionTimeRemaining || 'Countdown unavailable — please check your dashboard header.'}

I can explain the suspension reason, the remaining countdown, marketplace rules, how to request a review, how to contact admin, and how to avoid repeats.
I CANNOT remove the suspension — only an administrator can.`;
  } else {
    header =
      `Hi${name} — I'm running in offline mode right now for your seller account${store}, so I'm using my built-in operations guide.

Topics I can help with: adding products, updating stock, processing orders (Pending → Process → Shipped → Delivered), sales analytics, why a product isn't visible to buyers, messaging buyers, deleting products, and how to improve sales.
Ask a short question like "Why isn't my product showing?" or "How do I process an order?"`;
  }
  return pickKeywordFallback(message, library, header);
}

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
  try {
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

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok && data.reply) {
        return data.reply;
      }
    }
  } catch (err) {
    console.warn('Buyer AI endpoint unreachable, falling back to local guide:', err && err.message ? err.message : err);
  }

  return fallbackBuyerReply(cleanMessage, userName);
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
  try {
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

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok && data.reply) {
        return data.reply;
      }
    }
  } catch (err) {
    console.warn('Seller AI endpoint unreachable, falling back to local guide:', err && err.message ? err.message : err);
  }

  return fallbackSellerReply({
    message: cleanMessage,
    isSuspended,
    suspensionReason,
    suspensionTimeRemaining,
    sellerName,
    storeName,
  });
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