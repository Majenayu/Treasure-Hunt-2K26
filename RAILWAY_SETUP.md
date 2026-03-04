# Railway Environment Variables Setup

## Critical: Set VAPID Keys on Railway

Your Railway deployment is missing VAPID keys, causing the 503 error on notifications.

## Steps to Fix:

### 1. Get Your VAPID Keys
From your `.env` file:
```
VAPID_PUBLIC_KEY=BJBj26ErnitsBfoAzpEPS420Dly_Uc-izu5u96w09NdvK1k0lv24_QdgtMsq_wF24ILSFzEji0T_iiFAiO2CuFM
VAPID_PRIVATE_KEY=Wg1PjS8OlPhBk4bl-9YTCEdHDhTuTYb82MJIrszki24
```

### 2. Add to Railway Dashboard

1. Go to https://railway.app/dashboard
2. Select your CodeHunt project
3. Click on your service
4. Go to "Variables" tab
5. Click "New Variable"
6. Add these two variables:

```
Variable Name: VAPID_PUBLIC_KEY
Value: BJBj26ErnitsBfoAzpEPS420Dly_Uc-izu5u96w09NdvK1k0lv24_QdgtMsq_wF24ILSFzEji0T_iiFAiO2CuFM

Variable Name: VAPID_PRIVATE_KEY
Value: Wg1PjS8OlPhBk4bl-9YTCEdHDhTuTYb82MJIrszki24
```

7. Railway will automatically redeploy

### 3. Verify Fix

After redeployment (takes ~2 minutes):
1. Refresh your browser
2. The 503 error should be gone
3. Notifications will work

## Important Notes

- **Use the SAME keys on ALL instances** (Railway + all Render accounts)
- Don't generate new keys - use the ones from your .env file
- Keys are safe to store in Railway environment variables (encrypted)

## After Setting Variables

The errors will be fixed:
- ✅ `/api/vapid-public-key` will return 200 OK
- ✅ Notifications will be enabled
- ✅ Organizers can receive alerts
