// WARNING: This requires Vercel to be configured with Firebase Admin SDK credentials.
// You must install the 'firebase-admin' package in your Vercel/GitHub project.
const admin = require('firebase-admin');

// IMPORTANT: Initialize Firebase Admin SDK ONLY IF it hasn't been initialized.
// This requires your service account key to be set securely in Vercel Environment Variables.
if (!admin.apps.length) {
    // You should configure a secure way to load your Admin credentials on Vercel.
    // A common method is to use a JSON service account key, but using Vercel's 
    // Environment Variables to store the key's content is more secure.
    // Example: process.env.FIREBASE_ADMIN_CREDENTIALS should hold the JSON content.
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Use the databaseURL if needed, but the Admin SDK usually infers it.
        });
    } catch (e) {
        console.error("Failed to initialize Firebase Admin SDK:", e);
        // Handle error: return a generic page or 500 status.
    }
}
const db = admin.firestore();


module.exports = async (req, res) => {
    // Ensure the response is HTML
    res.setHeader('Content-Type', 'text/html');

    // Get the app ID from the URL (adjust based on your Vercel routing configuration)
    // Assuming the URL structure is simple: /api/app/[id]?id=appId123
    const url = new URL(req.url, `https://${req.headers.host}`);
    const appId = url.searchParams.get('id');
    const currentBrowserURL = url.href;

    if (!appId) {
        return res.status(404).send('App ID missing.');
    }
    
    let appData = null;
    try {
        // 1. SERVER-SIDE DATA FETCH from Firestore
        const doc = await db.collection('apps').doc(appId).get();
        if (!doc.exists) {
            return res.status(404).send('App not found.');
        }
        appData = doc.data();

        // --- 2. Construct the DYNAMIC META TAGS ---
        const title = appData.title || "App Detail";
        const description = appData.Mdesc || appData.description || 'Check out this app on Probe-App!';
        const thumbnail = appData.thumbnail || 'https://default-thumbnail.png'; // Use a fallback image

        const ogTags = `
            <title>Probe-App: ${title}</title>
            <meta property="og:url" content="${currentBrowserURL}" />
            <meta property="og:title" content="${title} is on Probe-App!" />
            <meta property="og:description" content="${description}" />
            <meta property="og:image" content="${thumbnail}" />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Probe-App" />
            
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="${title} is on Probe-App!" />
            <meta name="twitter:description" content="${description}" />
            <meta name="twitter:image" content="${thumbnail}" />
        `;

        // 3. Serve the full HTML content by injecting the dynamic tags
        // This is where you substitute placeholders in your main HTML file.
        // For simplicity, we use a string replace here.
        // The placeholder {{OG_TAGS_PLACEHOLDER}} must exist in your static HTML file.
        
        // **NOTE**: You would need to read your original static HTML file content here.
        // Example: const staticTemplate = require('fs').readFileSync('./app-details.html', 'utf8');
        const staticTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            {{OG_TAGS_PLACEHOLDER}}
            <link rel="stylesheet" href="/app.css"> 
        </head>
        <body>
            <div id="appTitle"></div> 
            <script src="/appl.js.js"></script>
        </body>
        </html>
        `;

        const finalHTML = staticTemplate.replace('{{OG_TAGS_PLACEHOLDER}}', ogTags);

        return res.status(200).send(finalHTML);

    } catch (error) {
        console.error('Server-Side Rendering Error:', error);
        // Fallback to a generic 500 page or redirect
        return res.status(500).send('<h1>Server Error Loading App</h1>');
    }
};
