# Bloop

**Janani Acharya, Shrika Andhe, Shayla Kumaresan, Lucas Kalani Ross**

Bloop is an app where users can find public bathrooms in Los Angeles.

## Initialization

**Requires Node v22.0** (see [installation guide](https://nodejs.org/en/download)) 

Run ``npm install`` to install all dependencies.

Configure environment ``.env`` file in project directory with private API keys:
```
VITE_GOOGLE_MAPS_KEY=INSERT-KEY-HERE
VITE_GOOGLE_MAPS_ID=INSERT-MAP-ID-HERE
VITE_API_URL=http://localhost:3000/api
FIREBASE_PROJECT_ID=INSERT-PROJECT-ID-HERE
FIREBASE_CLIENT_EMAIL=INSERT-CLIENT-EMAIL-HERE
FIREBASE_PRIVATE_KEY=INSERT-PRIVATE-KEY-HERE
```

## Start Server

Run ``npm run dev`` to concurrently start Vite/React front-end server and Node/Express back-end server.

App will be live at http://localhost:5173/.

Close the app with CTRL+C in terminal.

If changes are made to Vite front-end (``/src/*``), the
app will update automatically. If changes are made to express back-end (``/server.js``, ``/vite.config.js``),
you will need to restart the server.