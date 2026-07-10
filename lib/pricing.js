const pricing = require('../config/pricing.json');

function getPlanDetails(mentorId, planId) {
  const mentor = pricing[mentorId];
  if (!mentor) return null;

  const plan = mentor.plans[planId];
  if (!plan) return null;

  return {
    mentorName: mentor.mentorName,
    planLabel: plan.label,
    amount: plan.amount,
    calls: plan.calls,
  };
}

module.exports = { getPlanDetails };
