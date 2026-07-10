const { google } = require('googleapis');

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function logPaymentToSheet({
  mentor,
  plan,
  amount,
  name,
  email,
  phone,
  orderId,
  paymentId,
  status,
}) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Payments!A:J';

  const values = [[
    new Date().toISOString(),
    mentor,
    plan,
    amount,
    name || '',
    email || '',
    phone || '',
    orderId,
    paymentId || '',
    status,
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

module.exports = { logPaymentToSheet };
