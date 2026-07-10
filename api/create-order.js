const Razorpay = require('razorpay');
const { getPlanDetails } = require('../lib/pricing');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    const planDetails = getPlanDetails(mentor, plan);

    if (!planDetails) {
      return res.status(404).json({ error: 'Unknown mentor or plan' });
    }

    const order = await razorpay.orders.create({
      amount: planDetails.amount * 100,
      currency: 'INR',
      receipt: `${mentor}_${plan}_${Date.now()}`,
      notes: {
        mentor,
        plan,
        mentorName: planDetails.mentorName,
        planLabel: planDetails.planLabel,
        name: name || '',
        email: email || '',
        phone: phone || '',
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      mentorName: planDetails.mentorName,
      planLabel: planDetails.planLabel,
      calls: planDetails.calls,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    // TEMPORARY DIAGNOSTIC - reveals the real reason Razorpay rejected the order.
    // Remove this extra detail once the issue is fixed.
    var razorpayMsg =
      (err && err.error && err.error.description) ? err.error.description :
      (err && err.message) ? err.message : String(err);
    var razorpayCode =
      (err && err.error && err.error.code) ? err.error.code :
      (err && err.statusCode) ? err.statusCode : null;
    return res.status(500).json({
      error: 'Could not create order',
      razorpaySays: razorpayMsg,
      razorpayCode: razorpayCode,
      keyIdSeen: process.env.RAZORPAY_KEY_ID || '(missing)',
      keySecretLength: process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0,
    });
  }
};
