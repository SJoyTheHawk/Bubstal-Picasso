# Platform image-copy research

Updated 2026-09-28.

## Findings

- **Shopee TW:** Shopee seller guidance distinguishes the cover image from other images. The cover should be clear, realistic, uncropped, and free of text or graphics; other images can show different angles, scale, and use. This supports concise factual selling points on later preview images while keeping the cover clean. See the [Shopee seller listing guidelines](https://cdngarenanow-a.akamaihd.net/shopee/seller/seller_cms/b71e298c6c220f22ef6f08608dbe1bd8/Mall%20Listing%20Guidelines.pdf).
- **Amazon Japan:** Amazon requires a clean primary image, including no text, logos, borders, colour blocks, watermarks, or graphics. Amazon Japan also describes secondary images such as comparison charts and images that explain product use. The policy is therefore primary-image restricted rather than text-free for the whole set. See [Amazon Japan's image guidance](https://sellercentral-japan.amazon.com/seller-forums/discussions/t/d77ff259-e346-418d-9998-63332f117acb?mons_sel_locale=en_JP) and [Amazon Japan's listing guide](https://sell.amazon.co.jp/en/learn/listing).
- **Rakuten Ichiba:** Rakuten's current product-image guideline permits text elements but limits the first product image and SKU images to 20% text occupancy. Product names, specifications, features, and catchphrases count as text elements. See the [Rakuten product-image guideline](https://www.rakuten.co.jp/ec/open/attention/pdf/disclosure/03_tempounei_guideline.pdf).

## Shaper policy

`app.js` encodes these as `PLATFORM_COPY_POLICIES`:

- Shopee TW: clean cover, then up to two concise Traditional Chinese factual image-copy items per later slot, with a 32-character limit.
- Amazon Japan: clean primary image, then at most one concise factual Japanese item per secondary slot, with a 32-character limit.
- Rakuten: concise Japanese image copy, with first-image/SKU text area limited to 20%.

The Shaper may author copy only with a `shaper-` id, the slot output locale, and `model-rendered` mode. Operator-approved copy remains exact. Safety, legal, disclaimer, exclusion, price, rating, and unsupported performance language remains outside authored image copy unless explicitly supplied and approved by the operator.

