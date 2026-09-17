const express = require('express');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(express.json({ limit: '50mb' }));

const auth = new GoogleAuth({
    scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/generative-language.retriever'
    ]
});

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
        res.json({ authenticated: true });
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
        const projectId = await auth.getProjectId();
        const response = await client.request({
            url: 'https://generativelanguage.googleapis.com/v1beta/interactions',
            method: 'POST',
            headers: {
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

// Credential files live under auth/ for local development and must never be served.
app.use('/auth', (req, res) => res.sendStatus(404));

// Serve the browser app from the same origin as the authentication API.
app.use(express.static(path.join(__dirname)));

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Bubstal Picaso running at http://localhost:${PORT}`);
    });
}

module.exports = app;
