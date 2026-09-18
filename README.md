# Bubstal Picasso

Bubstal Picasso is a lightweight eCommerce product image generator. It compiles operator inputs into inspectable prompt records, then uses Nano Banana Pro to render a coordinated image batch.

The product is designed to reduce repetitive designer time and production cost. Operators identify what Must be preserved, add a small amount of Preferred direction, and leave all other creative decisions open to the model.

## Features

- Amazon.co.jp, Shopee TW, and Rakuten marketplace presets
- Beauty, electronics, apparel, food, and home category guardrails
- Must Have and Preferred constraints; unselected details stay open
- Multiple product identity images plus style, layout, and color references
- Same-tone, different-design direction across a batch
- Gemini Shaper planning from product images, campaign context, and platform rules
- Nano Banana Pro generation at PNG/1K with platform aspect ratios
- Prompt records saved before rendering and output records saved as each slot completes
- Deterministic prompt-to-output mapping with isolated per-slot failures
- IndexedDB drafts and history
- Output-only JSON export for future human review
- Hybrid text handling for model-rendered headlines and later accuracy-critical overlays

## Setup

The server uses [Google Application Default Credentials (ADC)](https://docs.cloud.google.com/docs/authentication/application-default-credentials). Credentials and access tokens remain on the server.

Install dependencies:

```bash
npm install
```

Configure one ADC source for local development:

```bash
# User ADC for the Gemini API
gcloud auth application-default login \
  --client-id-file=client_secret.json \
  --scopes='https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/generative-language.retriever'

# Or use the supplied local service-account key
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/auth/service_auth.json"
```

Enable the Google Generative Language API and billing for the credential's project, then start the server:

```bash
npm start

# Uses auth/service_auth.json directly
npm run start:local

# Auto-reload for development
npm run dev
```

Open `http://localhost:3000`. The application must be served by the Node server; opening `index.html` as a `file://` URL will not provide the authentication API.

The default port is 3000. Override it with `PORT=8080 npm start`.

For production, attach a user-managed service account with only the required IAM roles. Do not deploy a service-account JSON key.

## Workflow

1. Select the marketplace, image count, and product category.
2. Enter the product name and any essential product facts.
3. Upload one or more product views.
4. Optionally upload references and mark their style, layout, or color roles.
5. Enable only the constraints that matter and mark each one Must Have or Preferred.
6. Add a short batch direction when needed.
7. Select Preview Prompts to create and inspect the cached Shaper plan and every exact prompt.
8. Generate from the preview or close it and select Generate Batch; both reuse the approved plan.
9. Inspect the generated images, prompt records, and text reserved for later overlay.
10. Export the output JSON when a batch is ready for review.

The Generate action first saves all compiled prompts, then generates each image from its exact slot prompt with at most two requests in flight. Every response is linked directly to the prompt ID that initiated it, and each outcome is saved as it completes.

## Image Generation Architecture

Bubstal Picasso uses one coordinated plan with deterministic per-slot rendering:

1. Gemini 3.5 Flash analyzes the inputs and creates one shared Shaper plan.
2. The compiler creates one auditable prompt record for every image slot.
3. Gemini 3 Pro Image generates each slot independently from that record.
4. Two slot requests run concurrently to balance latency and rate-limit pressure.
5. Every output is linked directly to its originating prompt ID.

This avoids relying on the order of partial multi-image responses, which do not
carry structured slot IDs or guarantee the requested image count. The shared
tone and sibling differentiators keep the independently rendered slots aligned
while discouraging repeated compositions. See `MULTI_IMAGE_OUTPUT_SUMMARY.md`
for the API analysis.

## Text Policy

Short operator-supplied promotional headlines may be rendered directly by Nano Banana. Accuracy-critical content such as prices, numeric claims, specifications, warnings, legal copy, and certifications is not typeset by the model. The generated scene reserves space for that text to be added by a later production step.

## Storage And Export

IndexedDB stores the complete local batch, including uploaded product and reference images. JSON export contains prompt records, copy plans, generated output images, statuses, and render settings. It does not contain uploaded source or reference image binaries.

The prompt and output IDs are intended to support a later human-review survey. Automatic prompt or image scoring is not part of this version.

## Technical Notes

- Frontend: vanilla HTML, CSS, and JavaScript
- Server: Express proxy using Google ADC
- Shaper model: `gemini-3.5-flash` (override with `SHAPER_MODEL_ID`)
- Image model: `gemini-3-pro-image` (override with `GEMINI_MODEL_ID`)
- Output: one PNG image per slot at 1K (1024x1024 for the current 1:1 templates)
- Input image limit: at most 14 combined product and visual-reference images are sent per request; product images take priority
- Rendering: one request per slot, with concurrency limited to two and no automatic variants
- Storage: one versioned IndexedDB batch record containing inputs, prompts, outputs, and legacy-compatible results

Marketplace and category presets are practical generation guidance. Sellers remain responsible for current marketplace, advertising, and legal compliance.
