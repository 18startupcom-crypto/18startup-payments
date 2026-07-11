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

    // SECURITY: the price is ALWAYS looked up here on the server.
    // Any "amount" sent from the browser or the URL is ignored completely,
    // so a customer cannot change what they are charged.
    const planDetails = getPlanDetails(mentor, plan);

    if (!planDetails) {
      return res.status(404).json({ error: 'Unknown mentor or plan' });
    }

    const receipt = `r_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: planDetails.amount * 100,
      currency: 'INR',
      receipt: receipt,
      notes: {
        mentor,
        plan,
        mentorName: planDetails.mentorName,
        planLabel: planDetails.planLabel,
        amount: planDetails.amount,
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
    return res.status(500).json({ error: 'Could not create order' });
  }
};
