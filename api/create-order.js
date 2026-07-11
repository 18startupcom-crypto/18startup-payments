const Razorpay = require('razorpay');
const { getPlanDetails } = require('../lib/pricing');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Turn a slug like "pranav-kay" into a display name like "Pranav Kay".
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
    const { mentor, plan, amount, name, email, phone } = req.body;

    if (!mentor || !plan) {
      return res.status(400).json({ error: 'mentor and plan are required' });
    }

    let finalAmount = null;
    let mentorName;
    let planLabel;
    let calls = null;

    // 1) Price sent from the Webflow button (primary).
    const amt = parseInt(amount, 10);
    if (!isNaN(amt) && amt >= 1) {
      finalAmount = amt;
      mentorName = titleCase(mentor);
      planLabel = titleCase(plan);
    } else {
      // 2) Fallback: look up the backend price list if no amount was passed.
      const planDetails = getPlanDetails(mentor, plan);
      if (!planDetails) {
        return res.status(400).json({ error: 'Price is missing for this booking.' });
      }
      finalAmount = planDetails.amount;
      mentorName = planDetails.mentorName;
      planLabel = planDetails.planLabel;
      calls = planDetails.calls;
    }

    const receipt = `r_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: finalAmount * 100,
      currency: 'INR',
      receipt: receipt,
      notes: {
        mentor,
        plan,
        mentorName,
        planLabel,
        amount: finalAmount,
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
