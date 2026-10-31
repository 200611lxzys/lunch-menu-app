# 好好吃饭 · DeepSeek Worker

This Worker proxies menu recommendation requests to the DeepSeek API. The browser never receives the DeepSeek API key.

## Deploy

1. Install Node.js, then from this directory run `npx wrangler login`.
2. Add the DeepSeek key as a Worker secret: `npx wrangler secret put DEEPSEEK_API_KEY`.
3. Deploy: `npx wrangler deploy`.
4. Open the Worker `/health` URL and confirm `configured: true`.
5. Copy the generated `https://<worker-name>.<account>.workers.dev` URL. The PWA endpoint is that URL plus `/api/menu`; set it as `AI_API_URL` in the website source and deploy the Pages update.

Do not put the API key in GitHub, HTML, browser storage, or chat. The Worker allows requests only from the GitHub Pages origin and applies a per-IP request limiter. A personal-use endpoint should still be monitored; the rate limiter is approximate and is not a hard spend cap.

## API

`POST /api/menu`

Body:
- `mode`: `generate` or `swap`
- `preferences`: meal type, servings, taste, allergens, dislikes, budget and time
- `dailyWish`: optional free text
- `recentDishes`: recent dish names
- `currentIds`: current recipe IDs by slot
- `targetSlot`: required for `swap`
- `candidates`: recipe candidates from the existing catalog

The response contains validated selections that refer to candidate IDs. The browser maps IDs back to its recipe catalog and stores the selected plan in localStorage.
