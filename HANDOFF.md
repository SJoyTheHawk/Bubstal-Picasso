# Product Image Prompt System: Handoff

## Objective

Build a lightweight system that reduces the time and manual work required to create repetitive eCommerce product images.

For the first trial, the system should take a small set of product inputs and produce a coordinated set of prompts for 10 product images. The prompts will be used with a separate image-generation AI.

The system should support different content preferences for different eCommerce platforms while allowing the business to enforce required information and reuse successful styles from earlier batches.

## Core Principle

The system should separate:

- Information that must be followed exactly
- Direction that should normally be followed
- Creative decisions the AI is free to make

It should not require users to complete a large or highly detailed product database before generating a batch.

## MVP Inputs

### 1. Product Content

Reusable information and assets associated with the product:

- Product images
- Product name and short description
- Key selling points
- Exact text that must appear
- Safety or legal text
- Distributor-required information
- Logos and packaging assets
- Product facts and claims the AI must not change or invent

### 2. Platform Template

A reusable recipe describing the needs of each sales platform:

- Number and purpose of images
- Information expected in each image
- Preferred text density
- Preferred composition
- Image dimensions or aspect ratio
- Platform-specific restrictions

For example, one platform may favor clean, minimal product images, while another may favor promotional copy and denser feature information.

### 3. Batch Direction

Instructions that apply only to the current batch:

- Campaign or promotional message
- Language
- Target customer
- Seasonal theme
- Features to emphasize
- Special requirements
- Previous batch or design to follow

This should primarily be a short free-text input so the workflow remains fast.

### 4. Style Reference

Users should be able to upload or select a previous image batch and specify how it should influence the new batch:

- Follow it closely
- Use it only as inspiration
- Keep the layout but change the colors
- Keep the colors and typography but change the scenes
- Create a new direction

An approved batch should be saveable as a reusable style profile so users do not need to upload and explain it again for future products.

## Constraint Model

Every relevant input or instruction can use one of three levels:

| Level | Meaning |
| --- | --- |
| Locked | Must appear or be followed exactly as supplied |
| Preferred | Should be followed unless there is a good visual reason not to |
| Free | The AI may decide |

Examples:

| Item | Constraint |
| --- | --- |
| Product appearance | Locked |
| Distributor text | Locked |
| Promotional price | Locked |
| Brand colors | Preferred |
| Previous batch layout | Preferred |
| Background props | Free |

This model provides control where the business needs it without making every creative choice a separate setting.

## Proposed User Flow

1. Upload product images.
2. Enter the product name and selling points.
3. Enter required text, claims, and safety information.
4. Select a platform template.
5. Upload or select a previous style reference.
6. Add requirements for the current batch.
7. Mark important items as Locked, Preferred, or Free.
8. Generate the 10-image prompt set.

## Expected Output

The system should produce one production package containing:

- Batch-wide style direction
- Shared product-preservation instructions
- A role and purpose for each of the 10 images
- An image-generation prompt for each image
- Required text for each image
- Layout and text-placement guidance
- Things the image generator must avoid

Example output structure:

```text
Batch-wide style instructions
Shared product-preservation instructions

Image 1
- Purpose
- Image-generation prompt
- Required text
- Layout instruction
- Things to avoid

...

Image 10
- Purpose
- Image-generation prompt
- Required text
- Layout instruction
- Things to avoid
```

## Required-Text Handling

Image-generation models are unreliable at rendering exact text. Prices, warnings, distributor copy, specifications, and other mandatory wording should therefore be added as conventional text layers after the base image is generated.

The prompt-generating AI should decide what text belongs in each image and reserve appropriate space for it. The production system should render the final text separately to preserve spelling, accuracy, and consistency.

## MVP Boundary

The first version should focus on:

- Generating one coordinated batch of 10 prompts
- Reusing product information across the batch
- Applying a selected platform template
- Following a previous visual style when requested
- Enforcing required content and allowing creative freedom elsewhere
- Producing clear guidance for later text placement

The first version does not need a comprehensive product-information-management system, fine-grained numerical controls for every visual property, or automatic final-image generation and publishing.

## Success Criteria

The trial is successful if a user can provide the core product materials once and quickly receive 10 usable, consistent prompts that:

- Fit the selected platform's content preferences
- Preserve required product facts and business information
- Reflect the requested campaign and reference style
- Require substantially less manual briefing and repetition
- Reduce corrections caused by missing text, inconsistent style, or unwanted creative changes

## Product Summary

**Product assets + platform template + previous style + current requirements -> 10 production-ready image prompts and text-layout instructions.**
