# Phase 2.3 Step 4: Plan Content Review

Source: `/private/tmp/phase2-step4-rerun.json`, checked against `benchmarks/phase-2-3c/manifest.json` and both supplied product images on 2026-09-28.

## Decision

The six Shaper plans are structurally valid and all succeeded on the first attempt. Their content is still not approved for image generation. The image runner requires a separate explicit content-review file with `approved: true` for every arm before making image calls. The review file must match this rerun's exact `sourceRun`.

## Findings

| Case | Arm | Content issue |
| --- | --- | --- |
| Amazon beauty | unguided | Slot 3 still assumes an evening skincare routine and absorption, which the input does not establish. |
| Amazon beauty | original | Slot 3 still states that the treatment is preferred by the Japanese market without supplied or tested evidence. |
| Amazon beauty | revised | Slot 3 uses a spa-like usage setting and application experience as facts not established by the input. |
| Shopee electronics | unguided | Slot 3 still treats adjacent cable and pouch as confirmed in-box contents; slot 2 adds unsupported performance framing. |
| Shopee electronics | original | Slot 3 still calls adjacent items confirmed in-box accessories and adds an unsupported documents envelope. |
| Shopee electronics | revised | Slot 3 still asserts confirmed accessories/manual despite no supplied bundle facts; slot 3 usage direction adds an unverified outdoor scenario. |

The photos do show yellow product texture for the beauty item and a cable plus a soft case next to the camera. Those visible elements are not the issue. A product photo alone does not establish that each pictured accessory is included in the sold bundle, and it does not show the documentation or branded envelope named by Shaper.

## Next Decision

The common Shaper prompt now states these evidence limits, but this rerun shows that prompt text alone is not a sufficient content gate. Add a deterministic pre-image content check for package-contents roles when the manifest supplies no explicit bundle facts, then rerun all six arms with the same benchmark inputs. Review the resulting plans again. Only then set an arm's `approved` field to `true` in a content-review file tied to that exact run. The image runner will then use those saved plans, without rerunning Shaper.

After generation, review every image for product identity, platform rules, slot purpose, sibling diversity, unsupported claims or props, locale, and exact copy handling. The current sample is 18 images; the full-size seven- and ten-slot benchmark from the completion plan remains a later gate.
