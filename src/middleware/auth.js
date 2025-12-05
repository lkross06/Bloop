// src/middleware/auth.js
import admin from "../admin.js";

/**
 * Middleware to verify Firebase ID token from Authorization header
 * Attaches decoded token (user info) to req.user for use in controllers
 * 
 * Usage:
 * router.post("/", verifyToken, createReview);
 * router.put("/:id", verifyToken, updateReview);
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "No token provided. Please include 'Authorization: Bearer <token>' header." 
      });
    }
    
    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Token is missing." 
      });
    }
    
    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user information to request object
    // This makes it available in controllers via req.user
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
      // Include any other fields you need from decodedToken
    };
    
    // Continue to next middleware/controller
    next();
    
  } catch (error) {
    console.error("Token verification error:", error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Token has expired. Please sign in again." 
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Token has been revoked." 
      });
    }
    
    // Generic error response
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Invalid or expired token." 
    });
  }
};

