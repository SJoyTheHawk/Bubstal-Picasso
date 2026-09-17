# Bubstal Picaso - Product Image Prompt Generator

AI-powered tool for generating structured prompts for product promotional images targeting e-commerce platforms.

## Features

### ✅ Implemented

- **Platform Templates**: Amazon.co.jp, Shopee TW, Rakuten with platform-specific prompt modifiers
- **Drag & Drop Image Upload**: Product images and reference images with intuitive UI
- **Multi-Role Reference Images**: Each reference image can serve as style, layout, and/or color reference simultaneously
- **Constraint System**: 
  - Enable/disable individual constraint fields
  - Toggle between "Locked" (must follow) and "Preferred" (should follow)
  - Visual color coding (red = locked, yellow = preferred, gray = disabled)
- **Scalable Image Count**: Dropdown to generate 1-10 images per batch
- **Prompt Cascading**: Structured prompt building following VLM-inspired architecture
- **Persistent Storage**: IndexedDB for saving batches with full input state and results
- **History Panel**: Browse and restore previous batches
- **Responsive Design**: Clean, modern UI that works on desktop and tablet

### 🔌 Setup Required

**1. Start the Application Server**

The server uses [Google Application Default Credentials (ADC)](https://docs.cloud.google.com/docs/authentication/application-default-credentials). The browser never reads credential JSON or receives Google access tokens; authenticated Google API requests are made by the server.

Install dependencies:

```bash
npm install
```

For local development, choose one ADC setup:

```bash
# User ADC for the Gemini API (requires a Desktop OAuth client JSON)
gcloud auth application-default login \
  --client-id-file=client_secret.json \
  --scopes='https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/generative-language.retriever'

# Or point ADC at the supplied service-account key
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/auth/service_auth.json"
```

Then start the application server:

```bash
npm start

# Convenience command for the supplied auth/service_auth.json key
npm run start:local

# Or for development with auto-reload
npm run dev
```

Open `http://localhost:3000` in your browser. Do not open `index.html` directly as a `file://` URL because browser security rules block the authentication request.

The server uses port 3000 by default. You can change it with:
```bash
PORT=8080 npm start
```

The authentication library searches in ADC order: `GOOGLE_APPLICATION_CREDENTIALS`, the local file created by `gcloud auth application-default login`, then an attached service account from the Google Cloud metadata server. The server requests both the `cloud-platform` and `generative-language.retriever` OAuth scopes required by the Gemini OAuth flow.

The Google Generative Language API must also be enabled for the credential's project, with billing and Gemini API access configured for that project.

**2. Production Authentication**

On Google Cloud, attach a user-managed service account with only the IAM roles the application needs. Do not deploy `auth/service_auth.json`; ADC automatically uses the attached service account when no earlier credential source is configured.

Service-account key files are long-lived credentials and are ignored by this project. If a key has been committed, published, or served by an earlier version of this application, disable or delete that key in IAM and create a replacement only if local key-based authentication is still required.

## Platform Templates

### Amazon.co.jp
- **Style**: Clean, minimal, white background
- **Image Count**: 7 (default)
- **Focus**: Product clarity, trustworthy presentation
- **Constraints**: Product name, color, features, safety text, brand logo

### Shopee TW
- **Style**: Bold, promotional, vibrant backgrounds
- **Image Count**: 9 (default)  
- **Focus**: Attention-grabbing, feature callouts, pricing emphasis
- **Constraints**: Product name (Chinese/English), promotional price, selling points, campaign message, brand colors

### Rakuten
- **Style**: Detailed, informative, trust-focused
- **Image Count**: 7 (default)
- **Focus**: Quality emphasis, specifications, comparison-friendly
- **Constraints**: Product name (Japanese), specifications, quality claims, size info, trust markers

## Usage

1. **Select Platform**: Choose your target marketplace
2. **Set Image Count**: Pick how many images to generate (1-10)
3. **Upload Product Images**: Drag & drop or browse product photos
4. **Upload Reference Images** (optional): Add style/layout/color references
   - Check roles for each reference (can be multiple)
5. **Configure Constraints**:
   - Check boxes to enable fields
   - Toggle Locked 🔒 for must-have elements
   - Toggle Preferred ⭐ for should-have elements
   - Leave unchecked for creative freedom
6. **Add Batch Direction** (optional): Campaign message, seasonal theme, target audience
7. **Generate**: Creates prompts for all images
8. **Save Draft**: Preserves work-in-progress for later

## File Structure

```
Bubstal Picaso/
├── index.html          # Main UI structure
├── styles.css          # Modern, responsive styling
├── app.js              # Application logic, templates, IndexedDB
├── HANDOFF.md          # Original requirements document
└── README.md           # This file
```

## Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript (vanilla)
- **Authentication**: Server-side Google Application Default Credentials
- **Storage**: IndexedDB for offline-capable persistence
- **Image Handling**: Base64 encoding for storage and preview
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Future Enhancements

- Real nano banana 2 API integration
- Batch export (prompts + images as ZIP)
- Template customization UI
- Prompt template editor
- Multi-language support for constraint labels
- Cloud sync option
- Comparison view for A/B testing prompts

## Notes

- Currently uses mock API calls - generated images show product images as placeholders
- Reference images are stored as base64 in IndexedDB (suitable for reasonable quantities)
- Platform templates can be extended in `app.js` PLATFORM_TEMPLATES object
- Constraint fields per platform are fully customizable in template definitions
