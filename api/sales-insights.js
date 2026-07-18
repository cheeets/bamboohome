import Groq from "groq-sdk";

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
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
}