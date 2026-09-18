# Buyer Motivation Framework for Image Generation

## Purpose

This document defines buyer motivation codes and product involvement levels that guide role selection and visual emphasis in eCommerce image batches. Use this framework to infer buyer needs from product images and category, then weight slot roles accordingly.

## Buyer Motivation Codes

Choose ONE primary motivation and at most TWO secondary motivations based on product category, visible attributes, and likely purchase behavior.

### B1 Functional
**Focus:** Function, performance, problem-solving capability
**Product signals:** Tools, appliances, utilitarian packaging, problem-solution messaging
**Image emphasis:** Benefit visualization, usage demonstration, feature detail
**Avoid:** Pure aesthetic scenes without function context

### B2 Evidence-Seeking
**Focus:** Ingredients, specifications, tests, certification, proof
**Product signals:** Technical products, regulated categories (health, baby, medical), visible spec labels, certification marks
**Image emphasis:** Feature detail, material detail, scale reference, package contents
**Avoid:** Lifestyle scenes that obscure product detail

### B3 Lifestyle
**Focus:** Usage context, fit with daily life, aspirational scenes
**Product signals:** Fashion, home décor, leisure products, experience-oriented categories
**Image emphasis:** Lifestyle context, usage demonstration, benefit visualization
**Avoid:** Clinical or specification-heavy presentation

### B4 Aesthetic / Identity
**Focus:** Style, taste, self-projection, brand feeling
**Product signals:** Design-forward products, premium packaging, color/finish variety, style categories
**Image emphasis:** Hero shots, alternate views showing design details, material finish
**Avoid:** Generic or utilitarian presentation

### B5 Value-Seeking
**Focus:** Price, value, bundle composition, promotional advantage
**Product signals:** Multi-packs, bundles, promotional packaging, value categories
**Image emphasis:** Package contents, benefit visualization, reserve overlay area for price/promo copy
**Avoid:** Premium or luxury visual treatment

### B6 Convenience
**Focus:** Ease of use, speed, low friction, practical benefits
**Product signals:** Ready-to-use products, portable items, time-saving categories
**Image emphasis:** Usage demonstration, scale reference, package contents
**Avoid:** Complex or technical presentation

### B7 Expert
**Focus:** Technical detail, precision, comparison capability, deep specs
**Product signals:** Professional tools, technical hobbies, specialized equipment, detailed spec sheets
**Image emphasis:** Feature detail, material detail, scale reference, alternate views showing technical elements
**Avoid:** Lifestyle or emotional presentation

## Product Involvement Levels

Base involvement on decision complexity, perceived consequence, information need, and category conventions.

### Low Involvement
**Characteristics:** Routine purchase, low risk, minimal information needed
**Examples:** Basic consumables, familiar categories, impulse items
**Image strategy:** Favor hero + benefit + package contents; minimize detailed specs

### Medium Involvement
**Characteristics:** Some comparison, moderate information need, balance of emotion and facts
**Examples:** Most beauty, home goods, apparel, standard electronics
**Image strategy:** Balanced mix of hero, feature detail, lifestyle, and material detail

### High Involvement
**Characteristics:** Significant comparison, high information need, consequence of wrong choice
**Examples:** Technical products, expensive items, safety-critical categories, professional tools
**Image strategy:** Heavy feature detail, material detail, scale reference; reduce lifestyle scenes

## Evidence Discipline

### OBSERVED
Directly visible in the product image or explicitly stated in verified product metadata.
**Confidence:** 0.90-1.00

### INFERRED
Reasonable interpretation from visible evidence, but not a verified product fact.
**Confidence:** 0.50-0.89

### UNKNOWN
Cannot be established safely from current input.
**Confidence:** below 0.50

## Hard Prohibitions

Do NOT invent or infer:
- Ingredients or chemical composition
- Materials not visibly identifiable
- Certifications, awards, or ratings
- Medical, health, or efficacy claims
- Technical specifications not visible
- Country of origin or manufacturing details
- Price, discounts, or value comparisons
- Review scores or rankings
- Awards or endorsements
- Competitor comparisons
- Package contents not visible in images
- Demographic buyer attributes (age, gender, income, ethnicity) unless explicitly provided

## Role Weighting Guidance

Use buyer motivation to weight role selection within platform constraints:

**B1 Functional → emphasize:**
- `benefit` (show what problem it solves)
- `usage` (demonstrate function)
- `feature-detail` (key functional elements)

**B2 Evidence-Seeking → emphasize:**
- `feature-detail` (show specs visually)
- `material-detail` (proof of quality/composition)
- `scale` (accurate size reference)
- Reduce `lifestyle` (evidence > emotion)

**B3 Lifestyle → emphasize:**
- `lifestyle` (usage context scenes)
- `usage` (product in daily life)
- `benefit` (lifestyle improvement)

**B4 Aesthetic → emphasize:**
- `hero` (beautiful main shot)
- `alternate-view` (show design from angles)
- `material-detail` (finish and texture)
- Balance plain and scene-based slots

**B5 Value-Seeking → emphasize:**
- `package-contents` (show what you get)
- `benefit` (value delivered)
- Reserve overlay area for price/promo copy
- Reduce premium styling

**B6 Convenience → emphasize:**
- `usage` (show ease of use)
- `package-contents` (ready-to-use elements)
- `scale` (portability, size)

**B7 Expert → emphasize:**
- `feature-detail` (technical elements)
- `material-detail` (construction quality)
- `scale` (precise dimensions)
- `alternate-view` (technical angles)
- Minimize `lifestyle` (specs > scenes)

## Confidence Scoring

- **0.90-1.00:** Directly visible and unambiguous
- **0.70-0.89:** Strong inference with clear visual evidence
- **0.50-0.69:** Plausible but uncertain
- **Below 0.50:** Prefer marking as unknown

## Application to Slot Planning

1. Inspect product images for category signals, visible attributes, packaging style, and function indicators
2. Infer primary buyer motivation (required) and up to 2 secondary motivations
3. Determine product involvement level (low/medium/high)
4. Use motivation codes to weight role selection within platform slot count
5. Document reasoning in `buyerMotivation.reason` field
6. Report confidence score (0.0-1.0)

## Example Reasoning

**Product:** Skincare serum in frosted glass bottle with minimal label
**Primary motivation:** B4 Aesthetic (design-forward packaging, premium category)
**Secondary motivations:** B3 Lifestyle (daily beauty routine), B2 Evidence-Seeking (skincare requires some trust)
**Involvement:** Medium (personal care, visible on skin, moderate price)
**Confidence:** 0.75 (strong category signals, some inference on exact buyer priority)
**Role weighting:** Emphasize hero, material-detail (bottle finish), lifestyle (usage context); balance with feature-detail (ingredient messaging if supplied)

**Product:** USB-C cable in clear clamshell with spec sheet visible
**Primary motivation:** B7 Expert (technical category, specs visible)
**Secondary motivations:** B2 Evidence-Seeking (need to verify compatibility), B6 Convenience (commodity purchase)
**Involvement:** Low to Medium (low price but compatibility matters)
**Confidence:** 0.85 (category clearly technical)
**Role weighting:** Emphasize feature-detail (connector close-up), scale (length), material-detail (build quality); minimal lifestyle

## Integration Note

This framework enriches the Shaper's existing `productRead` reasoning. It does NOT replace:
- Platform hard rules (Amazon white background, aspect ratios, text-on-image policies)
- Category preservation guidance (geometry, colors, materials, packaging)
- Operator constraints (Must Have and Preferred inputs)
- Existing `verificationNeed`, `purchaseType`, `infoLocation` fields

Buyer motivation informs role emphasis within existing guardrails, not in place of them.
