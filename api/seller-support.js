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
}