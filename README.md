# Bloop

**Janani Acharya, Shrika Andhe, Shayla Kumaresan, Lucas Kalani Ross**

Bloop is an app where users can find public bathrooms in Los Angeles.

## Initialization

Run ``npm install`` to install all dependencies.

Configure environment ``.env`` file with JavaScript Google Maps API private key and map ID:
```
VITE_GOOGLE_MAPS_KEY=INSERT-KEY-HERE
VITE_GOOGLE_MAPS_ID=INSERT-MAP-ID-HERE
```

## Start Server

Run ``npm run dev`` to concurrently start Vite front-end server and Express.js back-end server.

App will be live at http://localhost:5173/

Close the app with CTRL+C in terminal.

If changes are made to Vite front-end (``/src/*``), the
app will update automatically. If changes are made to express back-end (``/server.js``, ``/vite.config.js``),
you will need to restart the server.