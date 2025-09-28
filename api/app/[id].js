// WARNING: This requires Vercel to be configured with Firebase Admin SDK credentials.
const admin = require('firebase-admin');
const fs = require('fs'); // <--- ADD THIS LINE to read the template file
const path = require('path'); // <--- ADD THIS LINE for correct pathing

// IMPORTANT: Initialize Firebase Admin SDK (as before)
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.error("Failed to initialize Firebase Admin SDK:", e);
    }
}
const db = admin.firestore();

// Define the path to your template file
// Assuming the template is now at the root or a known path like '/app-template.html'
const TEMPLATE_PATH = path.join(process.cwd(), 'template' ,'browse', 'app.html'); 
// Adjust the string 'app-template.html' if you placed it somewhere else.

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/html');

    const url = new URL(req.url, `https://${req.headers.host}`);
    const appId = url.searchParams.get('id');
    const currentBrowserURL = url.href;

    if (!appId) {
        return res.status(404).send('App ID missing.');
    }
    
    let staticTemplate;
    try {
        // READ THE STATIC HTML TEMPLATE FILE HERE
        staticTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    } catch (e) {
        console.error("Error reading template file:", e);
        return res.status(500).send('Error loading template file.');
    }

    try {
        // 1. SERVER-SIDE DATA FETCH (same as before)
        const doc = await db.collection('apps').doc(appId).get();
        if (!doc.exists) {
            // If app not found, serve the template but use generic tags
            const genericTags = `<title>App Not Found</title>`;
            const finalHTML = staticTemplate.replace('{{OG_TAGS_PLACEHOLDER}}', genericTags);
            return res.status(404).send(finalHTML);
        }

        const appData = doc.data();

        // --- 2. Construct the DYNAMIC META TAGS (same as before) ---
        const title = appData.title || "App Detail";
        const description = appData.Mdesc || appData.description || 'Check out this app on Probe-App!';
        const thumbnail = appData.thumbnail || 'https://default-thumbnail.png';

        const ogTags = `
            <title>Probe-App: ${title}</title>
            <meta property="og:url" content="${currentBrowserURL}" />
            <meta property="og:title" content="${title} is on Probe-App!" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${thumbnail}" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${title} is on Probe-App!" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${thumbnail}" />
        `;

        // 3. PERFORM THE REPLACEMENT
        const finalHTML = staticTemplate.replace('{{OG_TAGS_PLACEHOLDER}}', ogTags);

        // 4. Send the fully rendered HTML
        return res.status(200).send(finalHTML);

    } catch (error) {
        console.error('Server-Side Rendering Error:', error);
        return res.status(500).send('Server Error Loading App Data.');
    }
};
