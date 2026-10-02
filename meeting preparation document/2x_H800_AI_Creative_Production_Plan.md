# 2× H800 AI Creative Production Plan

## 1. Objective

We have secured a computer with **2× NVIDIA H800 GPUs** for a limited rental period.

The purpose is not simply to develop an AI platform. We want to use the GPUs to build a reusable AI creative capability **and generate real business output during the same period**.

Our first business objective is:

> **Create 10 proprietary AI characters that can repeatedly appear in e-commerce marketing images and videos.**

Around these characters, we will build:

- Character LoRAs
- Design/style LoRAs
- Product-presentation workflows
- Image-generation workflows
- Image-to-video workflows
- Product/character consistency checks
- A reusable creative asset library

The project therefore has two outputs:

### Output A — Business output

Actual marketing images and videos that can be used for products, campaigns, social media and marketplace promotion.

### Output B — Technical asset

A reusable internal system containing:

**Characters + LoRAs + workflows + datasets + prompts + evaluation methods + production knowledge**

The H800 period is successful only if we produce **both**.

---

## 2. The Fundamental Project Principle

The project should not be:

**R&D → R&D → R&D → Production**

Instead:

**Build minimum capability → Produce → Measure → Improve → Produce again**

R&D and production should overlap.

Every R&D activity should either:

1. Improve the next production batch, or
2. Create a reusable capability.

Every production batch should generate information that improves the next R&D experiment.

---

# 3. T−1 Week — Methodology Laboratory

**Primary machine: RTX 5070**

The RTX 5070 should be used as the **preparation and methodology-development machine**.

Its purpose is not to reproduce H800 performance. Its purpose is to answer the methodology questions before the H800 rental begins.

The goal is:

> **Arrive at T+0 Week with a known LoRA-building and deployment recipe.**

### 3.1 Dataset preparation

Take one test character and prepare approximately 20–40 images.

The dataset should contain variation in:

- Pose
- Expression
- Camera angle
- Crop
- Lighting
- Background
- Clothing where appropriate

The goal is to learn what makes a useful character-LoRA dataset.

The dataset should separate:

### Identity information

What makes the character the character.

from:

### Scene information

Pose, background, environment, lighting, composition, etc.

We do not want the character LoRA to accidentally learn one particular environment.

### 3.2 Captioning methodology

Test a consistent captioning structure.

For example:

```text
<character_token>, full body character,
standing in a studio, blue jacket,
looking toward camera
```

The exact captioning method should be tested rather than assumed.

The key principle is:

> **Teach identity while keeping scene conditions variable.**

A consistent trigger token should be used for the character.

### 3.3 LoRA training experiments

Use the RTX 5070 to learn the complete training procedure.

Experiment with a small parameter matrix covering:

- LoRA rank
- Alpha
- Learning rate
- Training steps
- Resolution
- Batch size / gradient accumulation
- Optimizer
- Precision

The objective is **not** to find the final perfect configuration.

The objective is to understand:

**Dataset → Configuration → Training → Checkpoint → Validation**

and establish a reproducible recipe.

The official Qwen-Image-2.1 LoRA training example can be used as a starting point, but its parameters should be treated as a starting configuration rather than a guaranteed optimum.

### 3.4 LoRA → ComfyUI deployment

This must be completed before T+0.

The complete test loop should be:

```text
Training
   ↓
Character LoRA (.safetensors)
   ↓
ComfyUI LoRA Loader
   ↓
Base Model + Character LoRA
   ↓
Generation
   ↓
Evaluation
```

The team should personally verify that a LoRA trained by the team can be loaded and used in ComfyUI.

This removes a major source of risk from the H800 period.

### 3.5 Character evaluation

Create a fixed validation grid:

1. Front portrait
2. Side portrait
3. Full body
4. Sitting
5. Walking
6. Different expression
7. Different background
8. Different lighting
9. Holding a product
10. Unusual composition

Use fixed prompts and seeds where appropriate.

Compare:

**Base model vs LoRA A vs LoRA B vs LoRA C**

The goal is to establish an objective evaluation method instead of selecting a model only because it “looks nicer.”

### 3.6 T−1 deliverables

Before the H800 rental starts, we should have:

- A test character dataset
- A captioning method
- A reproducible LoRA training command/configuration
- Several experimental LoRAs
- A validation prompt set
- A LoRA evaluation method
- A working `.safetensors` LoRA
- A working ComfyUI deployment
- A documented workflow
- A list of questions and problems to investigate on H800

The RTX 5070 becomes our **methodology laboratory and reference machine**.

---

# 4. Character / Style / Environment Architecture

The LoRA system should be modular.

We should not immediately train one giant LoRA containing:

**Character + background + product + lighting + composition**

Instead, separate the concepts.

```text
                    BASE MODEL
                        │
             ┌──────────┴──────────┐
             ↓                     ↓
      CHARACTER LoRA         STYLE / WORLD
             │                     │
             └──────────┬──────────┘
                        ↓
                PRODUCT REFERENCE
                        ↓
                   COMPOSITION
                        ↓
                     OUTPUT
```

This allows combinations such as:

```text
Character 03
+
Premium Style
+
Kitchen Environment
+
Product A
```

and:

```text
Character 03
+
Cute Style
+
Outdoor Environment
+
Product B
```

The same character can therefore operate in multiple commercial contexts.

### 4.1 Level A — Character LoRA

Purpose:

> **Who is the character?**

Examples:

- `char_001`
- `char_002`
- ...
- `char_010`

This is the highest-priority LoRA category.

### 4.2 Level B — Design Language LoRA

Purpose:

> **How does the visual world look?**

Possible directions:

- Cute commercial illustration
- Premium lifestyle
- Minimalist
- Editorial
- Futuristic
- Seasonal
- Toy-like
- Fantasy

We should initially create only a small number of design languages.

Expand the library only when production demonstrates a real need.

### 4.3 Level C — Environment / Campaign

Environment and campaign behavior should initially be handled through:

- Prompting
- Reference images
- Composition workflows
- Image editing
- Masks
- Reference/control mechanisms

Do not automatically create a new LoRA for every environment.

Only create an environment/style LoRA when repeated production demonstrates that the visual behavior is worth making reusable.

---

# 5. T+0 Week — H800 Scale-Up and First Production

The first H800 week has two objectives:

1. Reproduce the methodology developed on the RTX 5070.
2. Start generating actual commercial content immediately.

## H800 #1

Primary use:

- Character LoRA training
- LoRA experiments
- Model experiments

## H800 #2

Primary use:

- Image generation
- Image editing
- Workflow testing
- First production assets

The GPUs should not be treated as permanently assigned resources. They are two parallel workers.

When one finishes training, it can immediately move to production. When production demand decreases, it can run R&D experiments.

### T+0 Week goals

- Verify both H800s
- Reproduce the LoRA workflow
- Benchmark training and generation
- Train Character 01
- Validate Character 01
- Begin Characters 02–03
- Begin real product generation
- Establish production workflow
- Record GPU time and production metrics

The key milestone is:

> **The H800 should be producing useful marketing assets during the first week, not merely proving that the environment works.**

---

# 6. T+1 Week — Character Production

By T+1, the project should move from methodology discovery toward production.

## R&D

- Optimize Character 01
- Train Characters 02–03
- Test character/product interaction
- Test different environments
- Test first design-language concepts

## Production

Use real products to generate:

- Product hero images
- Lifestyle images
- Product interaction images
- Promotional images
- Social-media assets

Start producing a real creative library rather than demonstrations only.

---

# 7. T+2 Week — Scale the Visual System

At this point the character-training process should become increasingly repeatable.

## R&D

Develop:

- Characters 04–07
- 2–3 initial design languages
- Character + style combinations
- Character + product combinations
- Product-reference workflows

## Production

Generate:

- Product hero images
- Lifestyle scenes
- Product demonstrations
- Promotional compositions
- Social content

Begin image-to-video experiments using the best image assets.

The question is no longer:

> “Can AI generate an image?”

It becomes:

> **“Which AI-generated creative concepts are useful for our products?”**

---

# 8. T+3 Week — Production Sprint

The final week should be heavily production-oriented.

## R&D

Complete or refine:

- Characters 08–10
- Selected style LoRAs
- Production workflows
- Image-to-video workflow
- QA methods

R&D should now be targeted.

Do not spend remaining H800 time on experiments that do not improve production or create a reusable capability.

## Production

Generate the largest practical batch of useful assets.

Potential output:

```text
10 Characters
     ×
Multiple Products
     ×
Multiple Creative Concepts
     ×
Images + Videos
```

The exact quantity should be determined from measured throughput and quality rather than an arbitrary target.

---

# 9. Video Strategy

Video should be part of the production experiment, but it should not become a separate large R&D project.

Start with:

**Image → Short Video**

Use selected images to test:

- Character movement
- Product interaction
- Product demonstration
- Short promotional clips
- Social-media videos

The T+3 objective is not to build a complete proprietary video platform.

The objective is to answer:

> **Can our characters become commercially useful video assets?**

---

# 10. The Two-H800 Operating Model

The most useful way to think about the two H800s is as **two parallel workers**.

Example:

```text
H800 #1
Character 04 LoRA training
          ↓
Character 04 ready
          ↓
Production generation
```

while:

```text
H800 #2
Character 01
+
Product 23
+
Style B
          ↓
Marketing assets
```

Then the workers can swap roles.

This creates an important property:

> **Training does not need to stop production, and production does not need to stop R&D.**

---

# 11. Do Not Overbuild the API During the H800 Period

The first month should prioritize creative production.

A full production API, authentication layer, job-management system and complex workflow abstraction can be developed later after the useful workflows are known.

For the first month, a reliable internal setup is sufficient:

```text
ComfyUI
   ↓
Versioned workflows
   ↓
Simple production scripts / interface
   ↓
Asset storage
   ↓
Metadata
```

The infrastructure should support the experiment without becoming the experiment.

---

# 12. What the RTX 5070 Is — and Is Not

The RTX 5070 should remain useful after the H800 rental.

## Use it for

- Workflow development
- LoRA methodology
- Dataset preparation
- Captioning experiments
- Small-scale model experiments
- ComfyUI development
- Reproducibility testing
- Future maintenance

## Do not use it to predict

- H800 generation throughput
- H800 training time
- Final production capacity

The RTX 5070 is our **development/reference machine**.

The H800s are our **scale and production machines**.

---

# 13. The LoRA Factory Recipe

Before T+0, create a one-page internal recipe:

```text
CHARACTER LoRA RECIPE v0.1

1. Dataset
   20–50 images

2. Image requirements
   Pose / angle / expression / background variation

3. Caption format
   Trigger + identity + scene description

4. Base model
   [selected model]

5. Resolution
   [tested value]

6. Rank
   [tested value]

7. Alpha
   [tested value]

8. Learning rate
   [tested value]

9. Training steps
   [tested range]

10. Training command
    [reproducible command]

11. Validation prompts
    [fixed validation set]

12. Evaluation
    Identity / pose / scene / product interaction

13. Export
    safetensors + metadata

14. ComfyUI
    Load LoRA → generation workflow

15. Pass criteria
    [defined by team]
```

The T−1 objective is to fill this recipe with real experimental results.

At T+0, we change only what needs to change for the larger model and H800 environment.

---

# 14. Evaluation

## Character

Measure:

- Identity consistency
- Face consistency
- Body/silhouette consistency
- Pose robustness
- Expression robustness
- Scene robustness
- Product interaction

## Product

Measure:

- Product identity
- Product geometry
- Feature preservation
- Logo/text correctness
- Artifact rate

## Creative

Measure:

- Prompt adherence
- Visual quality
- Style consistency
- Commercial usability

The evaluation set should remain fixed enough to compare different LoRA versions.

---

# 15. Production Metrics

The most important production metric is not:

> Images generated

It is:

> **Usable marketing assets produced**

For example:

```text
1,000 generated images
        ↓
300 pass automatic/human QA
        ↓
100 approved
        ↓
30 actually used
```

Then calculate:

> **Total production cost / 30 usable assets**

Track:

- GPU hours
- Generation time
- Images/hour
- LoRA training time
- LoRA experiments/day
- Successful generation rate
- Human hours/product
- Time/product
- Products processed/day
- Cost per usable asset

---

# 16. Business Metrics

Once generated assets enter real marketing usage, measure:

### Marketing

- CTR
- Conversion rate
- Add-to-cart
- Engagement
- Revenue / creative

### Productivity

- Human hours/product
- Time/product
- Products processed/day
- Creative assets/product

### Commercial

- Revenue
- Gross profit
- Creative production cost
- Product launch time
- Inventory sell-through
- Leftover inventory

The long-term question is:

> **How much business output can one month of H800 access enable?**

---

# 17. What We Should Have at the End

The H800 period should leave us with several categories of assets.

## Model assets

- Approximately 10 character LoRAs
- Selected style LoRAs
- Base model configurations
- Video workflow/model configuration

## Data assets

- Character datasets
- Captions
- Product reference datasets
- Validation datasets
- Creative examples
- Approved/rejected outputs

## Workflow assets

- Character generation workflow
- Product marketing workflow
- Image-editing workflow
- Video workflow
- QA workflow

## Knowledge assets

- Training configurations
- Generation settings
- Character-specific instructions
- Product-category instructions
- Known failure modes
- Evaluation methodology

## Commercial assets

- Actual marketing images
- Actual marketing videos
- Performance data
- Human evaluation results

The rental should therefore leave behind **a capability**, not merely a collection of experiments.

---

# 18. Final Project Principle

The project should follow:

> **T−1: Learn**

> **T+0: Prove**

> **T+1: Produce**

> **T+2: Scale**

> **T+3: Commercialize**

Here **T−1, T+0, T+1, T+2, T+3 refer to project weeks**, not seconds or individual time units.

The central idea is:

> **We are not renting two H800s to learn how LoRA works. We learn the methodology beforehand so that the H800s can immediately be used to create proprietary IP and actual commercial content.**

The LoRA is the technical mechanism.

The 10 characters are the initial proprietary asset.

The images and videos are the immediate business output.

The production workflow, datasets, evaluation methods and commercial data are the long-term company capability.
