# PayHere Integration Configuration

## Environment Variables Required

Add these to your `.env` file for PayHere API integration:

```env
# PayHere Merchant Setup (One-time Payment/IPN)
PAYHERE_MERCHANT_ID=YOUR_MERCHANT_ID
PAYHERE_MERCHANT_SECRET=YOUR_MERCHANT_SECRET
PAYHERE_SECRET_FORMAT=auto  # or 'base64' or 'plain'

# PayHere App Setup (OAuth for Subscription API)
PAYHERE_APP_ID=YOUR_APP_ID
PAYHERE_APP_SECRET=YOUR_APP_SECRET

# Environment
PAYHERE_ENV=sandbox  # or 'live'
PAYHERE_HASH_MODE=auto  # recommended; use 'prehashed' only if secret is already MD5

# URLs
PAYHERE_RETURN_URL=http://localhost:5173/subscription?payment=success
PAYHERE_CANCEL_URL=http://localhost:5173/subscription?payment=cancelled
PAYHERE_NOTIFY_URL=http://localhost:7001/api/billing/payhere/notify

# Frontend
FRONTEND_URL=http://localhost:5173
```

## Getting PayHere Credentials

### Step 1: Create API Keys (for one-time payments)
1. Sign in to PayHere Dashboard
2. Go to **Settings > API Keys**
3. Click **Create API Key**
4. Enter an app name & whitelist your domains
5. Check the "Automated Charging API" permission
6. Copy the **Merchant ID** and **Merchant Secret**

### Step 2: Create OAuth App (for Subscription Manager API)
1. In PayHere Dashboard, go to **Settings > API Keys** again
2. Click **Create API Key** (or use existing)
3. Note the **App ID** and **App Secret**
4. These are used for OAuth token generation to access subscription endpoints

## Available Endpoints

### For Users (Authenticated)
- `GET /api/subscriptions/user/current` - Get current subscription
- `POST /api/subscriptions/sync` - Sync subscription from PayHere
- `POST /api/subscriptions/:id/retry` - Retry failed subscription
- `POST /api/subscriptions/:id/cancel` - Cancel subscription

### For Admins
- `GET /api/subscriptions` - View all subscriptions
- `GET /api/subscriptions/:id` - Get subscription details
- `POST /api/subscriptions` - Create subscription
- `PATCH /api/subscriptions/:id` - Update subscription status

## How It Works

1. **User initiates payment** → POST `/api/billing/payhere/initialize`
2. **PayHere processes payment** → User completes checkout
3. **PayHere sends IPN notification** → POST `/api/billing/payhere/notify`
4. **Subscription stored in DB** with PayHere order ID
5. **Admin/User syncs status** → Calls `/api/subscriptions/sync`
6. **PayHere Subscription API** manages recurring charges
7. **User can retry/cancel** → Via new endpoints

## Data Flow

```
User Payment Request
    ↓
Initialize (get hash) → PayHere Checkout
    ↓
PayHere IPN Notify → Save to DB
    ↓
Sync With PayHere → Get subscription details
    ↓
Store subscription_id → Enable management
    ↓
Retry/Cancel/View via PayHere API
```

## Testing in Sandbox

Use PayHere's test card numbers:
- **Visa**: 4111111111111111
- **Expiry**: Any future date
- **CVV**: Any 3 digits

## Troubleshooting

| Error | Solution |
|-------|----------|
| "invalid_token" | App credentials expired or invalid |
| "Authentication error" | Domain not whitelisted in API Key settings |
| "Unauthorized payment request" | Use the **Merchant Secret** for checkout hash (never App Secret), verify Merchant ID/secret match the selected PAYHERE_ENV |
| "Subscription not eligible for retrying" | Only failed subscriptions can be retried |
| "Subscription is not found" | Subscription ID doesn't exist on PayHere |

## Security Notes

- ✅ App Secret never exposed to frontend
- ✅ OAuth tokens cached and auto-refreshed
- ✅ Webhook signature verified with merchant secret
- ✅ IP whitelisting enforced in live environment
- ⚠️ Always whitelist your server IP in PayHere dashboard for live
