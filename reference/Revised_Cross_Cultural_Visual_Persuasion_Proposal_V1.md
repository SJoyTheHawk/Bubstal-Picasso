From Cultural Translation to Algorithmic Adaptation

**A Visual Decision Intelligence Framework for Cross Cultural E Commerce**

**PROJECT PREMISE**

Existing research shows that cultural adaptation can influence persuasion, that individual visual characteristics affect consumer response, and that algorithms increasingly mediate cultural consumption. These literatures remain largely disconnected. This project proposes a testable framework in which e commerce visuals are conditioned by four domains: platform attributes, product and buyer understanding, market cultural context, and visual persuasion roles. The immediate engineering pilot will demonstrate that these domains can be operationalised consistently; subsequent academic studies will validate which relationships are real, generalisable, and behaviourally consequential.

# 1\. Research problem

Cross border e commerce requires the same product to be represented across different platform environments and cultural markets. However, the literature does not support a simple rule that localisation always improves persuasion. **Hornikx, Janssen, and O'Keefe (2026)** synthesised approximately 25 years of experiments on cultural value adaptation and found small positive average effects, but substantial heterogeneity and prediction intervals that included zero. The practical question is therefore not simply whether to adapt, but what should be adapted, for whom, on which platform, and under what market conditions.

Visual representation is a particularly suitable domain because it can be manipulated systematically. Wang et al. (2023) showed that contextual versus white product image backgrounds produced different responses depending on holistic versus analytic thinking. Other work has linked product image complexity, background foreground composition, and visual presentation to processing fluency, product evaluation, and willingness to pay.

At the same time, cultural intermediation is becoming increasingly computational. Fung (2021) described e commerce retailers as "cultural translators" that rearticulate foreign fashion discourse for Chinese consumers. Morris (2015) described "curation by code," while Airoldi and Rokka (2022) conceptualised algorithmic consumer culture. Generative systems extend this trajectory because they can modify the representation itself rather than merely select or recommend existing content.

**Core academic question**

How can the visual representation of the same product be systematically adapted to different platform environments, buyer decision needs, and cultural markets, and which of these adaptations actually influence consumer response?

# 2\. Literature positioning and gap

## 2.1 Cultural adaptation: meaningful but not dependable

The international advertising literature establishes that cultural adaptation can matter, but its effects are neither large nor stable. This creates space for a more granular approach that tests specific visual properties and contextual boundary conditions rather than assuming a single national style.

## 2.2 Visual persuasion: established effects, fragmented variables

E commerce research has examined individual visual characteristics such as visual complexity, contextual backgrounds, product image composition, tagging, and information presentation. Yet most studies isolate one or a small number of variables. The literature therefore provides evidence that visual cues matter without yet offering an integrated framework for deciding which visual treatment a specific product should receive in a specific selling environment.

## 2.3 Platform context is under integrated into visual adaptation

Platform design shapes what sellers can show, how much information can be integrated into images, how reviews and prices are surfaced, and how consumers navigate image sequences. Rather than treating marketplace names as styles, the proposed project represents platforms through measurable attributes that can later be coded and validated.

## 2.4 Cultural intermediary to algorithmic adaptation

Theoretical work on cultural intermediaries and algorithmic culture primarily concerns selection, circulation, recommendation, and classification. Generative commerce introduces a further shift: the intermediary can now actively reconstruct the visual representation of the commercial object before the consumer sees it. The project therefore studies not only whether AI generated content is liked, but how a computational system might learn the conditions under which different representations are persuasive.

## 2.5 Research gap

| **What is known**                                         | **What remains unresolved**                                             | **Proposed extension**                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Cultural adaptation can affect persuasion.                | Which specific visual treatments should vary across markets?            | Test market context as a measurable boundary condition.                |
| Individual visual properties influence consumer response. | How do these properties combine into different communicative functions? | Distinguish visual features from visual persuasion roles.              |
| Platform environments structure information presentation. | How should the same product representation change across marketplaces?  | Model platform attributes rather than marketplace stereotypes.         |
| Algorithms mediate cultural consumption.                  | What changes when systems can generate the representation itself?       | Examine computational visual adaptation as a new intermediary process. |

# 3\. Proposed Visual Decision Intelligence framework

The revised framework separates the conditions that shape a visual decision from the visual output itself. The four domains are designed as research constructs first and engineering modules second.

| **Domain** | **Name**                    | **Research question**                                                     | **Initial variables**                                                                                                                                                |
| ---------- | --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain 1   | Platform Attributes         | How the selling environment constrains or encourages visual presentation. | Information density, main image purity, text integration, contextual imagery, branding freedom, social proof, promotion salience, image sequence dependency.         |
| Domain 2   | Product Buyer Understanding | What the product is and what decision support the likely buyer requires.  | Product attributes, probable function, product involvement, buyer motivation, purchase risk, information need, uncertainty.                                          |
| Domain 3   | Visual Persuasion Roles     | What communicative job each image performs.                               | Hero, close up, multi angle, human usage, lifestyle, scale reference, feature explanation, comparison, trust evidence, package / what you get.                       |
| Domain 4   | Market Cultural Context     | Which market level tendencies may condition visual response.              | Contextual imagery preference, information density tolerance, trust evidence requirement, social proof sensitivity, promotion sensitivity, lifestyle identification. |

**Important methodological boundary**

The platform and market scores used in the engineering pilot are priors for stimulus generation, not validated academic findings. The academic programme will test and revise them through coding, expert validation, consumer experiments, and later marketplace behaviour.

# 4\. Research questions

**RQ1.** How do platform attributes condition the appropriate visual representation of products in e commerce environments?

**RQ2.** How do product characteristics and inferred buyer decision needs shape the persuasive function required from e commerce visuals?

**RQ3.** Which visual persuasion effects are stable across East Asian markets, and which are contingent on market cultural context?

**Computational objective.** Can these relationships be operationalised into a Visual Decision Intelligence model that produces testable visual recommendations?

# 5\. Phase 0: Engineering Pilot V0

Before testing causal effects, Narrates will build a controlled engineering pilot to demonstrate that the proposed constructs can be translated into reproducible visual outputs. The pilot is a feasibility and stimulus generation stage, not an academic validation of the scores.

## 5.1 User flow

**•** The user selects a marketplace / platform environment.

**•** The user uploads one product image.

**•** The system resolves the relevant market context and platform attribute profile.

**•** AI analyses the product and infers buyer decision needs, explicitly separating observed, inferred, and unknown information.

**•** The system generates all 10 visual persuasion roles in one run.

**•** Every output stores the platform attributes, market priors, product analysis, role, prompt version, and model version for later research use.

## 5.2 Pilot scale

**Pilot volume**

100 products × 3 platform environments × 3 market contexts × 10 visual persuasion roles = 9,000 generated image outputs.

This full matrix is an engineering corpus, not a requirement that every image be shown to participants. Academic studies will sample controlled subsets so that platform, market, product, and visual role effects can be isolated rather than confounded.

## 5.3 Initial platform and market coverage

The engineering system can support platform environments such as Amazon JP, Rakuten, Yahoo Shopping JP, Qoo10 JP, and Shopee Taiwan. For the first academic comparison, however, a narrower pairing such as Amazon JP versus Rakuten is preferable because the market can be held constant while platform attributes vary.

Likewise, the initial market context layer may include Japan, Taiwan, Mainland China, and Hong Kong as engineering priors, while the first cross cultural experiment should use only the markets for which comparable participants and stimuli can be secured.

# 6\. Academic validation programme

| **Study** | **Focus**                              | **Design logic**                                                                                                                | **Primary outputs**                                                                           |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Study 1A  | Product Buyer Understanding Validation | Compare AI product classification, attributes, buyer motivation, information needs, and confidence against human expert coding. | Agreement, accuracy, calibration.                                                             |
| Study 1B  | Platform Attribute Validation          | Systematically code marketplace listings using the platform attribute framework, with multiple coders.                          | Inter coder reliability and empirically estimated platform profiles.                          |
| Study 1C  | Visual Role Validation                 | Test whether the 10 proposed image roles are perceived as performing distinguishable persuasion functions.                      | Role recognition, diagnosticity, informativeness, risk reduction, mental simulation.          |
| Study 1D  | Controlled Cross Cultural Experiment   | Manipulate selected visual treatments while holding product and platform conditions constant.                                   | Preference, trust, informativeness, purchase intention, behavioural choice.                   |
| Study 2   | Marketplace Field Validation           | Deploy validated treatments in real merchant environments.                                                                      | CTR, add to cart, conversion, revenue per impression, return or cancellation where available. |

## 6.1 Why the engineering pilot precedes the experiment

The engineering pilot creates a controlled stimulus factory. Rather than manually designing isolated experimental images, the research team can generate systematically documented variants and then choose the most theoretically relevant contrasts for each study. This also ensures that the eventual commercial system and the academic research use the same underlying representations and metadata.

# 7\. Expected academic contributions

**From visual features to visual functions.** Existing work often isolates image properties. This project distinguishes how an image looks from what persuasive function it is intended to perform.

**Platform attributes as a boundary condition.** The same product may require different representation because the platform structures information, social proof, promotion, branding, and image sequence differently.

**Market culture as a testable context, not a stereotype.** Market level priors are treated as hypotheses to be validated, with individual level measures used where appropriate.

**From cultural translation to computational adaptation.** The project extends cultural intermediary theory from human retailers and recommendation systems toward generative systems that can reconstruct commercial representation.

**Lab to field generalisability.** The programme tests whether controlled visual effects predict actual marketplace behaviour.

# 8\. Research assets and knowledge transfer potential

| **Research asset**                   | **Potential KT output**                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Platform Attribute Framework         | Validated marketplace profiles and coding protocol.                                                             |
| Product Buyer Understanding Model    | A structured model of product attributes, buyer motivation, information needs, and uncertainty.                 |
| Visual Persuasion Role Taxonomy      | A validated set of image functions for e commerce product communication.                                        |
| Cross Market Visual Response Dataset | A documented dataset linking product, platform, market, visual treatment, and consumer response.                |
| Visual Decision Intelligence Layer   | A later predictive model that recommends visual treatments conditional on product, buyer, platform, and market. |

# 9\. Proposed collaboration with Prof. Anthony Fung

**•** Theoretical framing: cultural translation, platform studies, cultural consumption, and algorithmic mediation.

**•** Research design: determine which platform attributes, visual roles, and cultural constructs deserve formal validation.

**•** Mainland China access: participant recruitment, merchant or platform connections, and possible institutional collaborators.

**•** Publication strategy: identify which studies form distinct papers and which theoretical contribution should anchor each paper.

**•** Knowledge transfer: define which outputs could become CUHK related research assets or intellectual property before commercial deployment.

# 10\. Decisions requested from the first discussion

**•** Is the four domain framework theoretically coherent enough to anchor a research programme?

**•** Which literature should serve as the primary theoretical anchor: cultural intermediation, cross cultural advertising, platform affordances, or a combination?

**•** Which 3–4 platform attributes should be validated first rather than attempting to validate all attributes simultaneously?

**•** Which of the 10 visual persuasion roles are strongest theoretically and which should be merged or removed before experimentation?

**•** Which three market contexts are most realistic for the first comparative study given access to participants and partners?

**•** What should be the first publishable paper: platform attribute validation, visual role validation, or cross cultural visual persuasion?

# Appendix A. Initial operational domains for Pilot V0

## A1. Platform Attributes

**•** Visual information density

**•** Main image purity constraint

**•** Text integration affordance

**•** Contextual / lifestyle affordance

**•** Seller branding freedom

**•** Social proof salience

**•** Promotion / price salience

**•** Image sequence dependency

## A2. Product Buyer Understanding

**•** Product category and type

**•** Observable product attributes

**•** Probable function and usage context

**•** Product involvement

**•** Primary and secondary buyer motivation

**•** Purchase risk

**•** Key information needs

**•** Unknowns and confidence

## A3. Ten Visual Persuasion Roles

**•** Hero Image

**•** Detail Close Up

**•** Multi Angle View

**•** Human Usage

**•** Lifestyle Context

**•** Scale Reference

**•** Feature Explanation

**•** Comparison

**•** Trust Evidence

**•** Package / What You Get

## A4. Market Cultural Context

**•** Contextual imagery preference

**•** Information density tolerance

**•** Trust evidence requirement

**•** Social proof sensitivity

**•** Promotion sensitivity

**•** Lifestyle identification

# Appendix B. Key references retained from the original proposal

Airoldi, M. (2021). The techno-social reproduction of taste boundaries on digital platforms: The case of music on YouTube. Poetics, 89, 101563. <https://doi.org/10.1016/j.poetic.2021.101563>

Airoldi, M., & Rokka, J. (2022). Algorithmic consumer culture. Consumption Markets & Culture, 25(5), 411–428. <https://doi.org/10.1080/10253866.2022.2084726>

Fung, A. (2021). Transnational flow of Chinese and UK fashion discourse: Analyses of digital platforms and online shopping in China. Fashion Theory, 25(7), 917–930. <https://doi.org/10.1080/1362704X.2021.1979789>

Hornikx, J., Janssen, A., & O'Keefe, D. J. (2026). Cultural value adaptation in advertising is effective, but not dependable: A meta-analysis of 25 years of experimental research. International Journal of Business Communication. <https://doi.org/10.1177/23294884231199088>

Morris, J. W. (2015). Curation by code: Infomediaries and the data mining of taste. European Journal of Cultural Studies, 18(4–5), 446–463. <https://doi.org/10.1177/1367549415577387>

Wang, A., Pan, J., Jiang, C., & Jin, J. (2023). Create the best first glance: The cross-cultural effect of image background on purchase intention. Decision Support Systems, 170, 113962. <https://doi.org/10.1016/j.dss.2023.113962>

Wu, K., Vassileva, J., Zhao, Y., Noorian, Z., Waldner, W., & Adaji, I. (2016). Complexity or simplicity? Designing product pictures for advertising in online marketplaces. Journal of Retailing and Consumer Services, 28, 17–27. <https://doi.org/10.1016/j.jretconser.2015.08.009>

Chaudhuri, N., Gupta, G., & Lim, W. M. (2026). A stimulus-organism-response eye-tracking survey of how background-foreground images drive image appeal, product perception, and willingness to pay in e-commerce. Journal of Retailing and Consumer Services, 88, 104508. <https://doi.org/10.1016/j.jretconser.2025.104508>