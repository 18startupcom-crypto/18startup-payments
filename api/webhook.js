const crypto = require('crypto');
const getRawBody = require('raw-body');
const { logPaymentToSheet } = require('../lib/sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-razorpay-signature'];

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.warn('Webhook signature mismatch — rejecting.');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody.toString());
  const event = payload.event;

  const sheetsConfigured = !!process.env.GOOGLE_SHEET_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  try {
    if (event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const notes = payment.notes || {};
      console.log('Payment captured:', payment.id, notes.mentor, notes.plan, payment.amount / 100);

      if (sheetsConfigured) {
        await logPaymentToSheet({
          mentor: notes.mentorName || notes.mentor || 'unknown',
          plan: notes.planLabel || notes.plan || 'unknown',
          amount: payment.amount / 100,
          name: notes.name,
          email: notes.email || payment.email,
          phone: notes.phone || payment.contact,
          orderId: payment.order_id,
          paymentId: payment.id,
          status: 'success',
        });
      }
    }

    if (event === 'payment.failed') {
      const payment = payload.payload.payment.entity;
      const notes = payment.notes || {};
      console.log('Payment failed:', payment.id, notes.mentor, notes.plan);

      if (sheetsConfigured) {
        await logPaymentToSheet({
          mentor: notes.mentorName || notes.mentor || 'unknown',
          plan: notes.planLabel || notes.plan || 'unknown',
          amount: payment.amount / 100,
          name: notes.name,
          email: notes.email || payment.email,
          phone: notes.phone || payment.contact,
          orderId: payment.order_id,
          paymentId: payment.id,
          status: 'failed',
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook processing error:', err);
    return res.status(200).json({ ok: true, warning: 'logged with errors' });
  }
};

// IMPORTANT: this must come AFTER the handler is assigned to module.exports,
// otherwise reassigning module.exports wipes it out and Razorpay signature
// verification breaks (bodyParser stays on, rawBody is empty).
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
