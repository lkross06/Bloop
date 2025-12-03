import { db } from "../admin.js";

/**
 * GET http://localhost:3000/api/users/:uid
 * Gets the user information by UID
 * @param {*} req.params.uid unique identifier for the user
 * @returns JSON representing the user
 */
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
