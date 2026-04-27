# Jibreel Backend - Phase 1

This backend adds secure Razorpay order creation and payment verification for the Jibreel Perfumes static frontend.

## What this backend currently does

- Creates Razorpay orders from cart items.
- Keeps Razorpay secret key on the backend only.
- Verifies Razorpay payment signature using HMAC SHA256.
- Saves local order records in `backend/data/orders.json`.
- Provides `/api/orders` for development order checking.

## Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

For macOS/Linux:

```bash
cp .env.example .env
```

Then edit `.env` and add your Razorpay test keys:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
```

## Run frontend locally

Use VS Code Live Server or any static server for the main project folder.

Recommended frontend URL:

```text
http://127.0.0.1:5500
```

If your frontend URL is different, update `FRONTEND_URL` in `backend/.env`.

## Test backend

Open:

```text
http://localhost:5000/api/health
```

Expected:

```json
{"status":"ok","service":"jibreel-backend"}
```

## Before live launch

This is Phase 1 development storage using a JSON file. Before going live, replace `orders.json` with a real database like MongoDB Atlas, PostgreSQL, or Supabase.
