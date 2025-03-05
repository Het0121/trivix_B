import { verifyJWT } from "./auth.middleware.js";
import { verifyAgencyJWT } from "./agencyAuth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Middleware to verify user type (Traveler or Agency) before accessing routes
export const verifyUser = asyncHandler(async (req, res, next) => {
    try {
        const userType = req.headers["user-type"];
        if (!userType) {
            return res.status(400).json({ error: "User type is required in headers." });
        }

        if (userType === "Traveler") {
            await verifyJWT(req, res, () => {
                req.userType = "Traveler"; // Set user type
                req.user = req.traveler;  // Normalize user object
                next();
            });
        } else if (userType === "Agency") {
            await verifyAgencyJWT(req, res, () => {
                req.userType = "Agency"; // Set user type
                req.user = req.agency;  // Normalize user object
                next();
            });
        } else {
            return res.status(400).json({ error: "Invalid user type. Must be 'Traveler' or 'Agency'." });
        }
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});