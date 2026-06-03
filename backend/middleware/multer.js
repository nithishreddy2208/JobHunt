import multer from "multer";

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB for both resumes and images

const RESUME_MIME_TYPES = ["application/pdf"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * Builds a single-file ("file" field) upload middleware that:
 *  - only accepts the given MIME types
 *  - enforces a 5 MB size cap
 *  - converts Multer/validation errors into a clean JSON 400 response instead
 *    of bubbling to Express's default HTML 500 handler (there is no global
 *    error middleware in this app).
 *
 * Resume and photo uploads MUST use different validators so an image can never
 * be stored as a resume and a PDF can never be stored as an avatar.
 */
const makeUploader = ({ allowed, rejectMessage }) => {
    const handler = multer({
        storage,
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: (req, file, cb) => {
            if (allowed.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(rejectMessage), false);
            }
        }
    }).single("file");

    return (req, res, next) => {
        handler(req, res, (err) => {
            if (!err) return next();

            let message = rejectMessage;
            if (err instanceof multer.MulterError) {
                message = err.code === "LIMIT_FILE_SIZE"
                    ? "File too large. Maximum size is 5 MB."
                    : err.message;
            } else if (err?.message) {
                message = err.message;
            }

            return res.status(400).json({ success: false, message });
        });
    };
};

// Resume uploads: PDF only (unchanged behavior, now with clean error handling).
export const singleUpload = makeUploader({
    allowed: RESUME_MIME_TYPES,
    rejectMessage: "Only PDF files are allowed for resumes"
});

// Backward-compatible alias with a clearer name.
export const resumeUpload = singleUpload;

// Profile photo uploads: common web image formats only.
export const photoUpload = makeUploader({
    allowed: IMAGE_MIME_TYPES,
    rejectMessage: "Only JPG, PNG, or WEBP images are allowed for profile photos"
});