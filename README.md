# 18startup — Single Dynamic Payment Page

One payment page (`/pay` on Webflow) that serves every mentor and every plan,
with the price looked up securely on the backend. Payments can optionally be
logged to Google Sheets (off by default until configured).

## How it works

1. Mentor pages (Webflow) have booking buttons with `data-mentor` and `data-plan`
   custom attributes. **No price is included in the button or URL — by design.**
2. Clicking a button redirects to `/pay?mentor=pranav-kay&plan=growth`.
3. The `/pay` page (Webflow Embed) calls this backend's `/api/create-order`, which
   looks up the REAL price server-side from `config/pricing.json` and creates a
   Razorpay order. The URL never carries an amount, so it cannot be tampered with.
4. The Razorpay checkout popup opens with the verified amount.
5. On payment, Razorpay calls `/api/webhook` directly (server-to-server). The
   webhook verifies the signature and, **if Google Sheets is configured**, logs the
   result.

## Folder structure

```
api/create-order.js       -> creates a Razorpay order with the correct server-side price
api/webhook.js            -> verifies payment signature + optional Google Sheets logging
lib/pricing.js            -> looks up mentor/plan price from config
lib/sheets.js             -> writes a row to Google Sheets (only if configured)
config/pricing.json       -> all mentors, plans, and prices (edit this to add mentors)
```

The Webflow snippets (click-redirect script and `/pay` embed) live in Webflow, not
in this repo.

## Setup steps

### 1. Razorpay
- Get your `Key ID` and `Key Secret` from Dashboard > Settings > API Keys.
- After deploying (step 3), go to Dashboard > Webhooks, add a webhook pointing to
  `https://YOUR-BACKEND.vercel.app/api/webhook`, subscribe to `payment.captured`
  and `payment.failed`, and copy the generated webhook secret into your Vercel
  environment variables as `RAZORPAY_WEBHOOK_SECRET`.

### 2. Google Sheets (optional — logging is skipped until these are set)
- Create a Google Sheet with a tab named exactly `Payments`.
- Add header row: `Timestamp | Mentor | Plan | Amount | Name | Email | Phone | Order ID | Payment ID | Status`
- In Google Cloud Console, create a Service Account, enable the Google Sheets API,
  and generate a JSON key.
- Share the Sheet with the service account's email (Editor access).
- Set `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` in Vercel.

### 3. Deploy the backend to Vercel
- Import this repo into Vercel and deploy.
- Add all variables from `.env.example` in Project Settings > Environment Variables.

### 4. Wire up Webflow
- Add the click-redirect script to the mentor page (before `</body>`).
- Add `data-mentor` and `data-plan` custom attributes to each "Book Now" button.
  **Do not add a price/amount attribute.**
- Create a Webflow page at `/pay`, add an Embed with the checkout code, and replace
  `BACKEND_URL` with your real Vercel URL.
- Create a simple `/thank-you` page for the post-payment redirect.

## Adding a new mentor (e.g. Prakash, Ajay, Abhimanyu)

1. Duplicate the mentor page in Webflow and set each button's `data-mentor` to the
   new mentor's ID and `data-plan` to each plan.
2. Add a matching entry in `config/pricing.json` with the same mentor ID and their
   plan prices, then redeploy.

No per-mentor backend changes are needed — one backend serves all mentors.

## Security note

The price is **never** present in the button, the URL, or anything the customer can
edit. The charge is always determined server-side in `api/create-order.js` from
`config/pricing.json`, so a customer cannot change what they are charged.
