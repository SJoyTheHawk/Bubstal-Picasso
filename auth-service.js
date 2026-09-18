const express = require('express');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Vertex AI (agent platform) only needs the cloud-platform scope. The model is
// called as a Model Garden publisher model, not through the API-key surface.
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3-pro-image';
const SHAPER_MODEL_ID = process.env.SHAPER_MODEL_ID || 'gemini-3.5-flash';
const LOCATION = process.env.GEMINI_LOCATION || 'global';

// The multi-region "global" endpoint has no region prefix; regional endpoints do.
function buildModelUrl(projectId) {
    const host = LOCATION === 'global'
        ? 'aiplatform.googleapis.com'
        : `${LOCATION}-aiplatform.googleapis.com`;

    return `https://${host}/v1/projects/${projectId}/locations/${LOCATION}`
        + `/publishers/google/models/${MODEL_ID}:generateContent`;
}

function buildShapeModelUrl(projectId) {
    const host = LOCATION === 'global'
        ? 'aiplatform.googleapis.com'
        : `${LOCATION}-aiplatform.googleapis.com`;
    return `https://${host}/v1/projects/${projectId}/locations/${LOCATION}`
        + `/publishers/google/models/${SHAPER_MODEL_ID}:generateContent`;
}

async function resolveProjectId() {
    return process.env.GEMINI_PROJECT_ID
        || process.env.GOOGLE_CLOUD_PROJECT
        || await auth.getProjectId();
}

function getGoogleApiError(error) {
    const responseData = error.response?.data;
    const apiError = Array.isArray(responseData)
        ? responseData[0]?.error
        : responseData?.error;

    return {
        status: error.response?.status || apiError?.code || 502,
        message: apiError?.message || error.message || 'Unknown Google API error',
        code: apiError?.status
    };
}

app.get('/api/auth/status', async (req, res) => {
    try {
        await auth.getClient();
        const projectId = await resolveProjectId();
        res.json({ authenticated: true, projectId, model: MODEL_ID, shaperModel: SHAPER_MODEL_ID, location: LOCATION });
    } catch (error) {
        console.error('ADC configuration error:', error.message);
        res.status(503).json({
            authenticated: false,
            error: 'Application Default Credentials are not configured'
        });
    }
});

// ADC discovers credentials from the environment, local gcloud credentials,
// or an attached service account. Credentials and tokens stay on the server.
app.post('/api/generate', async (req, res) => {
    try {
        const client = await auth.getClient();
        const projectId = await resolveProjectId();
        const response = await client.request({
            url: buildModelUrl(projectId),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-user-project': projectId
            },
            data: req.body
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        const { status, message, code } = getGoogleApiError(error);

        console.error('Google API request failed:', message);
        res.status(status).json({
            error: 'Google API request failed',
            message,
            code
        });
    }
});

// The Shaper is a text planning call. Keep it separate from the image model
// route so each model can be configured independently.
app.post('/api/shape', async (req, res) => {
    try {
        const client = await auth.getClient();
        const projectId = await resolveProjectId();
        const response = await client.request({
            url: buildShapeModelUrl(projectId),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-user-project': projectId
            },
            data: req.body
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        const { status, message, code } = getGoogleApiError(error);
        console.error('Shaper API request failed:', message);
        res.status(status).json({ error: 'Shaper API request failed', message, code });
    }
});

// Credential files live under auth/ for local development and must never be served.
app.use('/auth', (req, res) => res.sendStatus(404));

// Serve the browser app from the same origin as the authentication API.
app.use(express.static(path.join(__dirname)));

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Bubstal Picasso running at http://localhost:${PORT}`);
    });
}

module.exports = app;
