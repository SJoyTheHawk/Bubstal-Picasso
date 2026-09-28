#!/usr/bin/env node

/*
 * Prepare a controlled Phase 2.3c benchmark run.
 *
 * This command builds three Shaper request arms from the same case inputs:
 * unguided, original market guidance, and revised evidence-qualified guidance.
 * By default this command only prepares requests. With --execute-shaper it
 * verifies the local app server's ADC status and submits the three Shaper arms
 * through that server. It never reads credential files or exposes tokens.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ARMS = ['unguided', 'original', 'revised'];
const REPO_ROOT = path.resolve(__dirname, '..');

function usage() {
    console.error('Usage: node scripts/phase-2-3c-benchmark.js --manifest <file> [--out <file>] [--execute-shaper | --review-existing <run-file> | --prepare-images <run-file> | --execute-images <run-file>] [--content-review <file>] [--images-dir <dir>] [--server-url <url>] [--image-backend <qwen|gemini>]');
    process.exitCode = 2;
}

function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--manifest') args.manifest = argv[++index];
        else if (value === '--out') args.out = argv[++index];
        else if (value === '--server-url') args.serverUrl = argv[++index];
        else if (value === '--image-backend') args.imageBackend = argv[++index];
        else if (value === '--execute-shaper') args.executeShaper = true;
        else if (value === '--review-existing') args.reviewExisting = argv[++index];
        else if (value === '--prepare-images') args.prepareImages = argv[++index];
        else if (value === '--execute-images') args.executeImages = argv[++index];
        else if (value === '--images-dir') args.imagesDir = argv[++index];
        else if (value === '--content-review') args.contentReview = argv[++index];
        else if (value === '--help' || value === '-h') args.help = true;
        else throw new Error(`Unknown argument: ${value}`);
    }
    return args;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mimeType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg'
        : extension === '.webp' ? 'image/webp'
            : 'image/png';
}

function toDataUrl(value, manifestDir) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Every image reference must be a non-empty path or data URL.');
    if (value.startsWith('data:')) return value;
    const filePath = path.resolve(manifestDir, value);
    if (!fs.existsSync(filePath)) throw new Error(`Image reference does not exist: ${filePath}`);
    return `data:${mimeType(filePath)};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function loadApp() {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');
    const context = vm.createContext({
        Blob,
        URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
        console: {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn() {}
        },
        document: { addEventListener() {}, getElementById() { return null; }, createElement() { return {}; } },
        window: {},
        process: { cwd: () => REPO_ROOT },
        // Keep benchmark prompts equivalent to the browser, where Node's fs/path
        // modules are unavailable and the inline buyer-motivation fallback is used.
        require: moduleName => {
            if (moduleName === 'fs' || moduleName === 'path') {
                throw new Error('Node file modules are unavailable in the browser-equivalent benchmark context.');
            }
            return require(moduleName);
        }
    });
    vm.runInContext(`${source}\n;globalThis.__benchmarkApi = { PLATFORM_TEMPLATES, buildShaperPayload, validateRawShaperPlan, validateShaperPlan, buildImagePayload, compilePromptRecords, getSelectedAssets, setState(value) { state = value; } };`, context);
    return context.__benchmarkApi;
}

function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(item => stableJson(item)).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function validateManifest(manifest, manifestPath, api) {
    if (manifest.protocolVersion !== '2.3c') throw new Error('manifest.protocolVersion must be "2.3c".');
    if (!manifest.shaperModel || !manifest.imageModel) throw new Error('manifest.shaperModel and manifest.imageModel are required.');
    if (!manifest.seedPolicy) throw new Error('manifest.seedPolicy is required.');
    if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) throw new Error('manifest.cases must contain at least one case.');

    const ids = new Set();
    const manifestDir = path.dirname(manifestPath);
    manifest.cases.forEach((testCase, index) => {
        const label = `cases[${index}]`;
        ['caseId', 'platform', 'market', 'locale', 'category', 'productName', 'productImages'].forEach(field => {
            if (testCase[field] === undefined || testCase[field] === null) throw new Error(`${label}.${field} is required.`);
        });
        if (ids.has(testCase.caseId)) throw new Error(`Duplicate caseId: ${testCase.caseId}`);
        ids.add(testCase.caseId);
        const template = api.PLATFORM_TEMPLATES[testCase.platform];
        if (!template) throw new Error(`${label}.platform is not a supported platform: ${testCase.platform}`);
        if (!Array.isArray(testCase.productImages) || testCase.productImages.length === 0) throw new Error(`${label}.productImages must contain at least one image.`);
        const imageCount = Number(testCase.imageCount || template.imageCount);
        if (!Number.isInteger(imageCount) || imageCount < template.minImageCount || imageCount > template.maxImageCount) {
            throw new Error(`${label}.imageCount must be between ${template.minImageCount} and ${template.maxImageCount}.`);
        }
        testCase.productImages.forEach(image => toDataUrl(image, manifestDir));
        (testCase.referenceImages || []).forEach(image => {
            const source = typeof image === 'string' ? image : image.path;
            toDataUrl(source, manifestDir);
        });
    });
}

function caseState(testCase, manifestDir, template) {
    const dataImages = values => values.map((value, index) => ({
        id: `benchmark-${index + 1}`,
        name: typeof value === 'string' ? path.basename(value) : (value.name || path.basename(value.path)),
        data: toDataUrl(typeof value === 'string' ? value : value.path, manifestDir)
    }));
    const references = (testCase.referenceImages || []).map((value, index) => ({
        id: `reference-${index + 1}`,
        name: typeof value === 'string' ? path.basename(value) : (value.name || path.basename(value.path)),
        roles: typeof value === 'string' ? [] : (value.roles || []),
        data: toDataUrl(typeof value === 'string' ? value : value.path, manifestDir)
    }));
    return {
        platform: testCase.platform,
        market: testCase.market,
        locale: testCase.locale,
        instructionLanguage: testCase.instructionLanguage || 'en',
        copyItems: testCase.copyItems || [],
        imageCount: Number(testCase.imageCount || template.imageCount),
        category: testCase.category,
        productName: testCase.productName,
        productVariant: testCase.productVariant || '',
        categoryFacts: testCase.categoryFacts || '',
        categoryPreference: testCase.categoryPreference || '',
        productImages: dataImages(testCase.productImages),
        referenceImages: references,
        constraints: testCase.constraints || {},
        batchDirection: testCase.batchDirection || '',
        season: testCase.season || '',
        promotion: testCase.promotion || '',
        shaperPlan: null,
        imageCountTouched: true,
        currentBatch: null,
        authReady: false
    };
}

function fixedInputFingerprint(testCase) {
    return crypto.createHash('sha256').update(stableJson({
        caseId: testCase.caseId,
        platform: testCase.platform,
        market: testCase.market,
        locale: testCase.locale,
        category: testCase.category,
        productName: testCase.productName,
        productVariant: testCase.productVariant || '',
        categoryFacts: testCase.categoryFacts || '',
        imageCount: testCase.imageCount || null,
        productImages: testCase.productImages,
        referenceImages: testCase.referenceImages || [],
        copyItems: testCase.copyItems || [],
        constraints: testCase.constraints || {},
        seed: testCase.seed || null
    })).digest('hex');
}

function buildRun(manifest, manifestPath) {
    const api = loadApp();
    const manifestDir = path.dirname(manifestPath);
    const cases = [];

    manifest.cases.forEach(testCase => {
        const template = api.PLATFORM_TEMPLATES[testCase.platform];
        const arms = [];
        for (const arm of ARMS) {
            api.setState(caseState(testCase, manifestDir, template));
            const request = api.buildShaperPayload(template, { guidanceArm: arm });
            arms.push({
                arm,
                prompt: request.contents[0].parts[0].text,
                request,
                shaperResponse: null,
                review: {
                    productIdentity: null,
                    platformCompliance: null,
                    slotPurposeAdherence: null,
                    siblingSlotDiversity: null,
                    shopperInterpretation: null,
                    unintendedClaimsPropsPeopleText: null,
                    culturalAppropriateness: null,
                    copyAccuracy: null,
                    copyPlacement: null,
                    notes: '',
                    reviewer: ''
                }
            });
        }
        const baseline = arms[0].request;
        arms.slice(1).forEach(candidate => {
            if (stableJson(candidate.request.generationConfig) !== stableJson(baseline.generationConfig)) {
                throw new Error(`Generation config changed between arms for ${testCase.caseId}.`);
            }
            if (stableJson(candidate.request.contents[0].parts.slice(1)) !== stableJson(baseline.contents[0].parts.slice(1))) {
                throw new Error(`Image/reference inputs changed between arms for ${testCase.caseId}.`);
            }
        });
        cases.push({
            caseId: testCase.caseId,
            platform: testCase.platform,
            market: testCase.market,
            locale: testCase.locale,
            category: testCase.category,
            seed: testCase.seed || null,
            fixedInputFingerprint: fixedInputFingerprint(testCase),
            arms
        });
    });

    return {
        protocolVersion: '2.3c',
        generatedAt: new Date().toISOString(),
        shaperModel: manifest.shaperModel,
        imageModel: manifest.imageModel,
        seedPolicy: manifest.seedPolicy,
        arms: ARMS,
        approval: {
            status: 'pending-shaper-execution',
            rule: 'Approve revised only when it does not materially reduce identity or slot adherence and creates no unsupported cultural or promotional assumptions.'
        },
        cases
    };
}

function assessShaperResponse(response, expectedSlotCount) {
    const candidate = response?.candidates?.[0];
    const text = (candidate?.content?.parts || []).map(part => part.text || '').join('\n') || response?.text || '';
    const unfenced = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    let parsedPlan = null;
    let parseError = null;
    try {
        parsedPlan = JSON.parse(unfenced);
    } catch (error) {
        parseError = error.message;
    }
    const slots = Array.isArray(parsedPlan?.slots) ? parsedPlan.slots : [];
    const slotIndexes = slots.map(slot => Number.isInteger(slot?.index) ? slot.index : null);
    const presentIndexes = new Set(slotIndexes);
    const expectedIndexes = Array.from({ length: expectedSlotCount }, (_, index) => index + 1);
    const missingSlotIndexes = expectedIndexes.filter(index => !presentIndexes.has(index));
    const finishReason = candidate?.finishReason || null;
    const slotCountMatches = slots.length === expectedSlotCount && missingSlotIndexes.length === 0 && slotIndexes.every(index => index !== null) && presentIndexes.size === slots.length;
    const resolvedImageCountMatches = parsedPlan?.resolvedImageCount === expectedSlotCount;

    return {
        finishReason,
        parseable: parsedPlan !== null,
        parseError,
        expectedSlotCount,
        returnedSlotCount: parsedPlan ? slots.length : null,
        slotIndexes,
        missingSlotIndexes: parsedPlan ? missingSlotIndexes : expectedIndexes,
        resolvedImageCount: parsedPlan?.resolvedImageCount ?? null,
        slotCountMatches,
        resolvedImageCountMatches,
        readyForImageGeneration: finishReason === 'STOP' && parsedPlan !== null && slotCountMatches && resolvedImageCountMatches
    };
}

function reviewExistingResponses(run, manifest, manifestPath, api) {
    const manifestDir = path.dirname(manifestPath);
    const casesById = new Map(manifest.cases.map(testCase => [testCase.caseId, testCase]));

    run.cases.forEach(runCase => {
        const testCase = casesById.get(runCase.caseId);
        if (!testCase) throw new Error('Run contains a case missing from the manifest: ' + runCase.caseId);
        const template = api.PLATFORM_TEMPLATES[testCase.platform];
        const expectedSlotCount = Number(testCase.imageCount || template.imageCount);
        runCase.arms.forEach(arm => {
            if (!arm.shaperResponse) {
                arm.planValidation = { readyForImageGeneration: false, issue: 'missing-response' };
                arm.normalizedPlan = null;
                return;
            }
            const assessment = assessShaperResponse(arm.shaperResponse, expectedSlotCount);
            api.setState(caseState(testCase, manifestDir, template));
            const candidateText = (arm.shaperResponse?.candidates?.[0]?.content?.parts || [])
                .map(part => part.text || '').join('\n');
            const rawValidation = api.validateRawShaperPlan(candidateText, template);
            arm.planValidation = assessment;
            arm.planValidation.rawValid = rawValidation.valid;
            arm.planValidation.rawIssues = rawValidation.issues;
            arm.planValidation.retryCount = Math.max(0, (arm.shaperAttempts?.length || 1) - 1);
            arm.planValidation.readyForImageGeneration = assessment.readyForImageGeneration && rawValidation.valid;
            arm.normalizedPlan = api.validateShaperPlan(candidateText, template);
            arm.planValidation.normalizedPlanSource = arm.normalizedPlan.planSource;
            arm.planValidation.repairedSlotIndexes = arm.normalizedPlan.planSource === 'fallback'
                ? Array.from({ length: expectedSlotCount }, (_, index) => index + 1)
                : assessment.missingSlotIndexes;
        });
    });

    const validations = run.cases.flatMap(testCase => testCase.arms.map(arm => arm.planValidation));
    const readyCount = validations.filter(item => item?.readyForImageGeneration).length;
    run.reviewedAt = new Date().toISOString();
    run.approval.status = readyCount === validations.length
        ? 'pending-image-generation-and-human-review'
        : 'pending-shaper-retry';
    run.approval.shaperReadiness = {
        readyArms: readyCount,
        totalArms: validations.length,
        status: readyCount === validations.length ? 'ready' : 'incomplete'
    };
    return run.approval.shaperReadiness;
}

async function executeShaperArms(run, serverUrl, expectedImageBackend, manifest, manifestPath, api) {
    const baseUrl = serverUrl.replace(/\/$/, '');
    const statusResponse = await fetch(`${baseUrl}/api/auth/status`);
    if (!statusResponse.ok) throw new Error(`App server auth preflight failed (${statusResponse.status}). Start it with npm run start:local and confirm ADC is available.`);
    const authStatus = await statusResponse.json();
    if (!authStatus.authenticated) throw new Error('App server reports Google ADC is unavailable. Start it with npm run start:local and resolve the auth status before running benchmark calls.');
    if (expectedImageBackend && authStatus.imageBackend !== expectedImageBackend) {
        throw new Error(`Requested image backend "${expectedImageBackend}", but server reports "${authStatus.imageBackend}". Restart the server with IMAGE_GEN_BACKEND=${expectedImageBackend}.`);
    }
    run.server = {
        url: baseUrl,
        authenticated: authStatus.authenticated,
        projectId: authStatus.projectId,
        shaperModel: authStatus.shaperModel,
        imageBackend: authStatus.imageBackend,
        imageModel: authStatus.model,
        location: authStatus.location
    };

    const manifestCases = new Map(manifest.cases.map(testCase => [testCase.caseId, testCase]));
    for (const runCase of run.cases) {
        const testCase = manifestCases.get(runCase.caseId);
        if (!testCase) throw new Error(`Run contains a case missing from the manifest: ${runCase.caseId}`);
        const template = api.PLATFORM_TEMPLATES[testCase.platform];
        for (const arm of runCase.arms) {
            api.setState(caseState(testCase, path.dirname(manifestPath), template));
            arm.shaperAttempts = [];
            for (let attempt = 1; attempt <= 2; attempt += 1) {
                const response = await fetch(`${baseUrl}/api/shape`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(arm.request)
                });
                const body = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(`Shaper request failed for ${testCase.caseId}/${arm.arm} (${response.status}): ${body?.message || body?.error || 'no error details'}`);
                }
                const text = (body?.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('\n') || body?.text || body;
                const rawValidation = api.validateRawShaperPlan(text, template);
                arm.shaperAttempts.push({ attempt, rawValidation, response: body });
                arm.shaperResponse = body;
                if (rawValidation.valid || attempt === 2) break;
            }
        }
    }
}

function imageRunCases(run, manifest, manifestPath, api, imagesDir, contentReview = null) {
    const manifestCases = new Map(manifest.cases.map(testCase => [testCase.caseId, testCase]));
    const reviewedCases = new Map((contentReview?.cases || []).map(testCase => [testCase.caseId, new Map((testCase.arms || []).map(arm => [arm.arm, arm]))]));
    const outputCases = [];
    for (const runCase of run.cases) {
        const testCase = manifestCases.get(runCase.caseId);
        if (!testCase) throw new Error(`Run contains a case missing from the manifest: ${runCase.caseId}`);
        const template = api.PLATFORM_TEMPLATES[testCase.platform];
        const outputArms = [];
        for (const arm of runCase.arms) {
            const armOutput = { arm: arm.arm, planReady: Boolean(arm.planValidation?.readyForImageGeneration), planContentApproved: reviewedCases.get(runCase.caseId)?.get(arm.arm)?.approved === true, slots: [] };
            if (!armOutput.planReady || !arm.normalizedPlan) {
                armOutput.status = 'blocked-invalid-shaper-plan';
                outputArms.push(armOutput);
                continue;
            }
            const state = caseState(testCase, path.dirname(manifestPath), template);
            state.shaperPlan = arm.normalizedPlan;
            api.setState(state);
            const assets = api.getSelectedAssets();
            const records = api.compilePromptRecords();
            const caseDir = path.join(imagesDir, testCase.caseId, arm.arm);
            fs.mkdirSync(caseDir, { recursive: true });
            records.forEach(record => {
                const requestPath = path.join(caseDir, `slot-${String(record.index).padStart(2, '0')}.request.json`);
                const imagePath = path.join(caseDir, `slot-${String(record.index).padStart(2, '0')}.png`);
                fs.writeFileSync(requestPath, JSON.stringify(api.buildImagePayload(record, assets), null, 2));
                armOutput.slots.push({
                    slot: record.index,
                    promptId: record.id,
                    requestPath,
                    imagePath,
                    prompt: record.prompt,
                    visualElements: record.visualElements,
                    outputLocale: record.outputLocale,
                    copyItems: record.copyItems
                });
            });
            armOutput.status = armOutput.planContentApproved ? 'prepared' : 'blocked-content-review';
            outputArms.push(armOutput);
        }
        outputCases.push({ caseId: testCase.caseId, platform: testCase.platform, locale: testCase.locale, arms: outputArms });
    }
    return outputCases;
}

function extractGeneratedImage(body) {
    const part = (body?.candidates?.[0]?.content?.parts || []).find(item => item.inlineData?.data || item.inline_data?.data);
    if (!part) return null;
    const inlineData = part.inlineData || part.inline_data;
    return { mimeType: inlineData.mimeType || inlineData.mime_type || 'image/png', data: inlineData.data };
}

async function executeImageRun(imageRun, outputPath, serverUrl, expectedImageBackend) {
    const baseUrl = serverUrl.replace(/\/$/, '');
    const statusResponse = await fetch(`${baseUrl}/api/auth/status`);
    if (!statusResponse.ok) throw new Error(`App server auth preflight failed (${statusResponse.status}).`);
    const authStatus = await statusResponse.json();
    if (!authStatus.authenticated) throw new Error('App server reports Google ADC is unavailable.');
    if (expectedImageBackend && authStatus.imageBackend !== expectedImageBackend) throw new Error(`Requested image backend "${expectedImageBackend}", but server reports "${authStatus.imageBackend}".`);
    if (authStatus.model !== imageRun.imageModel) throw new Error(`Manifest image model "${imageRun.imageModel}" does not match server model "${authStatus.model}".`);
    imageRun.server = { url: baseUrl, authenticated: true, imageBackend: authStatus.imageBackend, imageModel: authStatus.model, projectId: authStatus.projectId, location: authStatus.location };
    fs.writeFileSync(outputPath, JSON.stringify(imageRun, null, 2));
    for (const testCase of imageRun.cases) for (const arm of testCase.arms) {
        if (arm.status !== 'prepared') continue;
        for (const slot of arm.slots) {
            try {
                const payload = readJson(slot.requestPath);
                const response = await fetch(`${baseUrl}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const body = await response.json().catch(() => null);
                if (!response.ok) throw new Error(body?.message || body?.error || `Image request failed (${response.status})`);
                const image = extractGeneratedImage(body);
                if (!image) throw new Error('Image response contained no inline image.');
                if (image.mimeType !== 'image/png') slot.imagePath = slot.imagePath.replace(/\.png$/, image.mimeType === 'image/jpeg' ? '.jpg' : '.bin');
                fs.writeFileSync(slot.imagePath, Buffer.from(image.data, 'base64'));
                slot.status = 'success';
                slot.mimeType = image.mimeType;
                slot.responseMetadata = { finishReason: body?.candidates?.[0]?.finishReason || null, usageMetadata: body?.usageMetadata || null };
            } catch (error) {
                slot.status = 'failed';
                slot.error = error.message;
            }
            fs.writeFileSync(outputPath, JSON.stringify(imageRun, null, 2));
        }
        arm.status = arm.slots.every(slot => slot.status === 'success') ? 'completed' : 'completed-with-errors';
        fs.writeFileSync(outputPath, JSON.stringify(imageRun, null, 2));
    }
    imageRun.status = imageRun.cases.every(testCase => testCase.arms.every(arm => arm.status === 'completed'))
        ? 'pending-human-review'
        : 'image-generation-errors';
    imageRun.completedAt = new Date().toISOString();
    fs.writeFileSync(outputPath, JSON.stringify(imageRun, null, 2));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || !args.manifest) return usage();
    const imageSource = args.prepareImages || args.executeImages;
    if ([args.executeShaper, args.reviewExisting, args.prepareImages, args.executeImages].filter(Boolean).length > 1) throw new Error('Choose one benchmark operation.');
    if (args.imageBackend && !['qwen', 'gemini'].includes(args.imageBackend)) throw new Error('--image-backend must be qwen or gemini.');
    const manifestPath = path.resolve(args.manifest);
    const manifest = readJson(manifestPath);
    const api = loadApp();
    validateManifest(manifest, manifestPath, api);
    if (imageSource) {
        const sourcePath = path.resolve(imageSource);
        const sourceRun = readJson(sourcePath);
        const contentReview = args.contentReview ? readJson(path.resolve(args.contentReview)) : null;
        if (contentReview && path.resolve(contentReview.sourceRun || '') !== sourcePath) throw new Error('Content review sourceRun must match the saved Shaper run.');
        const imagesDir = path.resolve(args.imagesDir || path.join(path.dirname(sourcePath), 'images'));
        const imageRun = {
            protocolVersion: '2.3c-image',
            sourceRun: sourcePath,
            generatedAt: new Date().toISOString(),
            imageModel: manifest.imageModel,
            status: 'pending-image-generation',
            cases: imageRunCases(sourceRun, manifest, manifestPath, api, imagesDir, contentReview)
        };
        const outputPath = path.resolve(args.out || path.join(path.dirname(sourcePath), args.executeImages ? 'image-run.json' : 'image-requests.json'));
        if (args.executeImages) {
            if (imageRun.cases.some(testCase => testCase.arms.some(arm => arm.status !== 'prepared'))) throw new Error('Every Shaper arm needs structural validity and explicit planContentApproved=true after content review before image generation.');
            await executeImageRun(imageRun, outputPath, args.serverUrl || 'http://localhost:3000', args.imageBackend);
            console.log('Image execution completed; human review remains pending.');
        } else {
            console.log('Image requests prepared; no image API calls were made.');
        }
        fs.writeFileSync(outputPath, JSON.stringify(imageRun, null, 2));
        console.log(`Prepared ${imageRun.cases.reduce((sum, item) => sum + item.arms.length, 0)} image arms: ${outputPath}`);
        return;
    }
    const run = args.reviewExisting
        ? readJson(path.resolve(args.reviewExisting))
        : buildRun(manifest, manifestPath);
    if (args.executeShaper) {
        await executeShaperArms(run, args.serverUrl || 'http://localhost:3000', args.imageBackend, manifest, manifestPath, api);
        const readiness = reviewExistingResponses(run, manifest, manifestPath, api);
        console.log('Shaper plan readiness: ' + readiness.readyArms + '/' + readiness.totalArms + ' arms valid.');
    } else if (args.reviewExisting) {
        const readiness = reviewExistingResponses(run, manifest, manifestPath, api);
        console.log('Reviewed saved responses without API calls: ' + readiness.readyArms + '/' + readiness.totalArms + ' arms valid.');
    }
    const defaultOutputDir = args.reviewExisting ? path.dirname(path.resolve(args.reviewExisting)) : path.dirname(manifestPath);
    const defaultOutputName = args.reviewExisting
        ? path.basename(args.reviewExisting, path.extname(args.reviewExisting)) + '.reviewed.json'
        : 'phase-2-3c-run.json';
    const outputPath = path.resolve(args.out || path.join(defaultOutputDir, defaultOutputName));
    if (args.reviewExisting && outputPath === path.resolve(args.reviewExisting)) {
        throw new Error('Reviewed output must be a different file so the original run is preserved.');
    }
    fs.writeFileSync(outputPath, JSON.stringify(run, null, 2));
    console.log(`Prepared ${run.cases.length} case(s) x ${run.arms.length} arm(s): ${outputPath}`);
    if (args.executeShaper) {
        console.log(`ADC preflight passed via ${run.server.url}; Shaper requests completed through the local app server.`);
        console.log(`Image backend: ${run.server.imageBackend} (${run.server.imageModel}). Image generation and human review remain pending.`);
        if (run.approval.status === 'pending-shaper-retry') console.log('Some arms are incomplete. Do not generate images from this run until the affected arms are rerun.');
    } else if (args.reviewExisting) {
        if (run.approval.status === 'pending-shaper-retry') console.log('Some arms are incomplete. See planValidation and normalizedPlan on each arm before image generation.');
    } else {
        console.log('Status: pending-shaper-execution; no model API calls were made.');
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(`Phase 2.3c benchmark error: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { assessShaperResponse, reviewExistingResponses, executeImageRun };
