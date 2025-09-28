const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url'); // Needed for handling query params

// IMPORTANT: Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        // NOTE: Ensure FIREBASE_ADMIN_CREDENTIALS is set as an environment variable in Vercel
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        // This will log to your Vercel dashboard if credentials fail
        console.error("Failed to initialize Firebase Admin SDK:", e); 
    }
}
const db = admin.firestore();

// Define the absolute path to your HTML template file
// Based on your confirmation: /template/browse/app.html
const TEMPLATE_PATH = path.join(process.cwd(), 'template', 'browse', 'app.html');

module.exports = async (req, res) => {
    // 🛑 CRITICAL FIX: Set the content type to HTML immediately
    // This tells the browser/scraper to interpret the response as an HTML document.
    res.setHeader('Content-Type', 'text/html');

    const url = new URL(req.url, `https://${req.headers.host}`);
    // Extract ID from the query string (e.g., ?id=app123)
    const appId = url.searchParams.get('id'); 
    const currentBrowserURL = url.href;

    if (!appId) {
        // If the ID is missing, we can't fetch the app data.
        return res.status(404).send('<h1>404 Not Found</h1><p>App ID is missing.</p>');
    }
    
    let staticTemplate;
    try {
        // 1. Read the static HTML template content
        staticTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    } catch (e) {
        console.error(`Error reading template file at ${TEMPLATE_PATH}:`, e);
        return res.status(500).send('<h1>500 Server Error</h1><p>Error loading the application template.</p>');
    }

    try {
        // 2. SERVER-SIDE DATA FETCH
        const doc = await db.collection('apps').doc(appId).get();

        if (!doc.exists) {
            // If app not found, serve the template but use generic tags
            const title = "App Not Found";
            const genericTags = `
                <title>${title}</title>
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="This app does not exist or has been removed." />
                <meta name="twitter:card" content="summary" />
            `;
            const finalHTML = staticTemplate.replace('{{OG_TAGS_PLACEHOLDER}}', genericTags);
            return res.status(404).send(finalHTML);
        }

        const appData = doc.data();

        // --- 3. Construct the DYNAMIC META TAGS ---
        // Ensure you have fallbacks in case data is missing
        const title = appData.title || "Unknown App";
        const description = appData.Mdesc || appData.description || 'Check out this app on Probe-App!';
        const thumbnail = appData.thumbnail || 'https://default-thumbnail.png'; // Use a real default thumbnail URL

        const ogTags = `
            <title>Probe-App: ${title}</title>
            <meta property="og:url" content="${currentBrowserURL}" />
            <meta property="og:type" content="website" />
            <meta property="og:title" content="${title} is on Probe-App!" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${thumbnail}" />
            
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${title} is on Probe-App!" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${thumbnail}" />
        `;

        // 4. PERFORM THE REPLACEMENT
        // This replaces the placeholder in the template with the dynamic meta tags
        const finalHTML = staticTemplate.replace('{{OG_TAGS_PLACEHOLDER}}', ogTags);

        // 5. Send the fully rendered HTML
        return res.status(200).send(finalHTML);

    } catch (error) {
        console.error('Server-Side Rendering Error:', error);
        return res.status(500).send('<h1>500 Server Error</h1><p>Failed to process app data.</p>');
    }
};
