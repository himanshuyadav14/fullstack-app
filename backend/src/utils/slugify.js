const crypto = require("crypto");

/**
 * Normalizes any text into a URL-friendly slug
 * Example: "PixelCraft Studios & Co.!" -> "pixelcraft-studios-co"
 */
const slugify = (text) => {
  if (!text || typeof text !== "string") return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphen
    .replace(/[^\w-]+/g, "") // Remove non-word chars (except hyphens)
    .replace(/--+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Trim hyphen from start
    .replace(/-+$/, ""); // Trim hyphen from end
};

/**
 * Generates a unique slug with random hex suffix if needed
 * Example: "pixelcraft-studios-a8f2"
 */
const generateSlugWithSuffix = (text) => {
  const baseSlug = slugify(text) || "org";
  const suffix = crypto.randomBytes(3).toString("hex"); // 6 character random hex
  return `${baseSlug}-${suffix}`;
};

module.exports = {
  slugify,
  generateSlugWithSuffix,
};
