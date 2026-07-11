const Razorpay = require('razorpay');
const { getPlanDetails } = require('../lib/pricing');
const { getPlanFromWebflow } = require('../lib/webflow');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// "growth" -> "Growth", "founder-advisory" -> "Founder Advisory"
function titleCase(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
    .join(' ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mentor, plan, name, email, phone } = req.body;

    if (!mentor || !plan) {
      return res.status(400).json({ error: 'mentor and plan are required' });
    }

    // SECURITY: the price is NEVER taken from the browser or the URL.
    // It is fetched server-side, so a customer cannot change what they pay.
    let amount = null;
    let mentorName = null;
    let planLabel = titleCase(plan);
    let calls = null;

    // 1) Webflow CMS is the source of truth (edit prices in Webflow).
    try {
      const wf = await getPlanFromWebflow(mentor, plan);
      if (wf) {
        amount = wf.amount;
        mentorName = wf.mentorName;
      }
    } catch (err) {
      console.error('Webflow price lookup failed:', err.message);
    }

    // 2) Fallback to the backend price list if Webflow isn't set up / has no price.
    if (amount === null) {
      const pd = getPlanDetails(mentor, plan);
      if (pd) {
        amount = pd.amount;
        mentorName = pd.mentorName;
        planLabel = pd.planLabel;
        calls = pd.calls;
      }
    }

    if (amount === null) {
      return res.status(404).json({ error: 'Unknown mentor or plan' });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `r_${Date.now()}`,
      notes: {
        mentor,
        plan,
        mentorName,
        planLabel,
        amount,
        name: name || '',
        email: email || '',
        phone: phone || '',
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      mentorName,
      planLabel,
      calls,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: 'Could not create order' });
  }
};
