# Bubstal Picaso

Bubstal Picaso is a lightweight eCommerce product image generator. It compiles operator inputs into inspectable prompt records, then uses Nano Banana Pro to render a coordinated image batch.

The product is designed to reduce repetitive designer time and production cost. Operators identify what Must be preserved, add a small amount of Preferred direction, and leave all other creative decisions open to the model.

## Features

- Amazon.co.jp, Shopee TW, and Rakuten marketplace presets
- Beauty, electronics, apparel, food, and home category guardrails
- Must Have and Preferred constraints; unselected details stay open
- Multiple product identity images plus style, layout, and color references
- Same-tone, different-design direction across a batch
- Nano Banana Pro generation at PNG/2K with platform aspect ratios
- Prompt records saved before rendering and output records saved after every request
- Partial batch recovery when an individual generation fails
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
7. Select Preview Prompts to inspect every exact prompt and request setting without calling the API.
8. Close the preview and select Generate Batch as the explicit generation action.
9. Inspect the generated images, prompt records, and text reserved for later overlay.
10. Export the output JSON when a batch is ready for review.

The Generate action first saves all compiled prompts, then renders images sequentially. Each result is saved immediately, so completed images remain available if a later request fails.

## Text Policy

Short operator-supplied promotional headlines may be rendered directly by Nano Banana. Accuracy-critical content such as prices, numeric claims, specifications, warnings, legal copy, and certifications is not typeset by the model. The generated scene reserves space for that text to be added by a later production step.

## Storage And Export

IndexedDB stores the complete local batch, including uploaded product and reference images. JSON export contains prompt records, copy plans, generated output images, statuses, and render settings. It does not contain uploaded source or reference image binaries.

The prompt and output IDs are intended to support a later human-review survey. Automatic prompt or image scoring is not part of this version.

## Technical Notes

- Frontend: vanilla HTML, CSS, and JavaScript
- Server: Express proxy using Google ADC
- Model: `gemini-3-pro-image`
- Output: one PNG image per slot at 2K
- Input image limit: at most 14 combined product and visual-reference images are sent per request; product images take priority
- Rendering: sequential, with no automatic retries or variants
- Storage: one versioned IndexedDB batch record containing inputs, prompts, outputs, and legacy-compatible results

Marketplace and category presets are practical generation guidance. Sellers remain responsible for current marketplace, advertising, and legal compliance.
