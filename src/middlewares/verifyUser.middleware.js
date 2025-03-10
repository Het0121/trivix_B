import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyJWT } from "./auth.middleware.js";
import { verifyAgencyJWT } from "./agencyAuth.middleware.js";


export const verifyUser = asyncHandler(async (req, res, next) => {
    // Fetch user type from cookies
    const userType = req.cookies?.userType;

    if (!userType) {
        throw new ApiError(400, "User type is required in cookies.");
    }

    // Map of valid user types to their verifiers
    const userTypeVerifiers = {
        Traveler: verifyJWT,
        Agency: verifyAgencyJWT,
    };

    const verifier = userTypeVerifiers[userType];
    if (!verifier) {
        throw new ApiError(400, "Invalid user type. Must be 'Traveler' or 'Agency'.");
    }

    // Delegate to the appropriate verifier
    await verifier(req, res, () => {
        // Normalize user data
        req.userType = userType;
        req.user = userType === "Traveler" ? req.traveler : req.agency;

        // If standalone, send a default response
        if (!next.name || next.name === "bound dispatch") {
            return res.json({
                success: true,
                userType: req.userType,
                user: req.user,
            });
        }

        // Otherwise, pass to next handler
        next();
    });
});