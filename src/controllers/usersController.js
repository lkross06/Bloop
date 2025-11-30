import { db } from "../admin.js";

export const ensureUserRecord = async (req, res) => {
  try {
    const { uid, email, displayName } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    const ref = db.collection("users").doc(uid);
    const docSnap = await ref.get();

    if (!docSnap.exists) {
      await ref.set({
        uid,
        email: email || null,
        displayName: displayName || null,
        createdAt: new Date().toISOString(),
        posts: []
      });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const ref = db.collection("users").doc(req.params.uid);
    const docSnap = await ref.get();

    if (!docSnap.exists)
      return res.status(404).json({ error: "User not found" });

    res.json(docSnap.data());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
