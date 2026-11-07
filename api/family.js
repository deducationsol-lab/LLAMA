import { auth, pool } from "../lib/auth.js";
import { createFamilyHandler } from "../server/family-handler.js";
export default createFamilyHandler(auth, pool);
