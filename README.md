# 18startup — Single Dynamic Payment Page

One payment page (`/pay` on Webflow) that serves every mentor and every plan,
with price looked up securely on the backend and every payment logged to
Google Sheets automatically.

## How it works

1. Mentor pages (Webflow CMS) have booking buttons with `data-mentor`, `data-plan`,
   `data-amount` attributes, bound to CMS fields.
2. Clicking a button redirects to `/pay?mentor=pranav-kay&plan=growth&amount=7499`.
3. The `/pay` page (Webflow Embed) calls this backend's `/api/create-order`,
   which looks up the REAL price server-side (ignores the URL amount — that's
   only used for a fast initial display) and creates a Razorpay order.
4. Razorpay checkout popup opens with the verified amount.
5. On payment, Razorpay calls `/api/webhook` directly (server-to-server).
   The webhook verifies the signature and logs the result to Google Sheets.

## Folder structure

```
api/create-order.js   -> creates a Razorpay order with the correct price
api/webhook.js         -> verifies payment + logs to Google Sheets
lib/pricing.js          -> looks up mentor/plan price from config
lib/sheets.js            -> writes a row to Google Sheets
config/pricing.json       -> all mentors, plans, and prices (edit this to add mentors)
webflow-snippets/          -> code to paste into Webflow
```

## Setup steps

### 1. Razorpay
- Get your `Key ID` and `Key Secret` from Dashboard > Settings > API Keys.
- After deploying (step 3), go to Dashboard > Account & Settings > Webhooks,
  add a webhook pointing to `https://YOUR-BACKEND.vercel.app/api/webhook`,
  subscribe to `payment.captured` and `payment.failed`, and copy the generated
  webhook secret into your environment variables.

### 2. Google Sheets
- Create a Google Sheet with a tab named exactly `Payments`.
- Add header row: `Timestamp | Mentor | Plan | Amount | Name | Email | Phone | Order ID | Payment ID | Status`
- In Google Cloud Console, create a Service Account, enable the Google Sheets API,
  and generate a JSON key.
- Share your Google Sheet with the service account's email address (Editor access).
- Copy the Sheet ID from its URL.

### 3. Deploy the backend to Vercel
```
npm install
vercel deploy
```
Add all variables from `.env.example` in Vercel Project Settings > Environment Variables.

### 4. Wire up Webflow
- Add `webflow-snippets/mentor-click-script.html` to your mentor CMS template.
- Add `data-mentor`, `data-plan`, `data-amount` custom attributes to each "Book Now" button,
  bound to the corresponding CMS fields.
- Create a new Webflow page at `/pay`, add an Embed element with the contents of
  `webflow-snippets/payment-page-embed.html`, and replace `BACKEND_URL` with your
  real Vercel URL.
- Create a simple `/thank-you` page for the post-payment redirect.

## Adding a new mentor (e.g. Prakash, Ajay, Abhimanyu)

1. Add a new CMS item in Webflow with their `Mentor ID` (must match the key you'll
   use in step 2) and their 3 plan prices — no code changes needed, their page
   renders from the existing template automatically.
2. Add a matching entry in `config/pricing.json` with the same mentor ID and their
   plan prices, then redeploy (`vercel deploy`).

That's it — the `/pay` page, the backend, and the webhook all just work for the
new mentor automatically since nothing is hardcoded per mentor.

## Security note

The amount shown on `/pay` and passed in the URL (`&amount=...`) is for display
only. The actual charge is always determined server-side in
`api/create-order.js` from `config/pricing.json`, so editing the URL cannot
change what a customer is actually charged.
