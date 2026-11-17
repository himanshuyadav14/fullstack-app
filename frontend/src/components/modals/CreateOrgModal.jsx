import { useState, useRef } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import { useOrgStore } from "../../stores/orgStore";

const INDUSTRIES = [
  "Software & Technology",
  "Design & Creative",
  "Marketing & Advertising",
  "E-Commerce & Retail",
  "Finance & Fintech",
  "Healthcare & Life Sciences",
  "Education & EdTech",
  "Consulting & Services",
  "Other",
];

const TEAM_SIZES = [
  { value: "1", label: "Just me (1 person)" },
  { value: "2-10", label: "2 - 10 employees" },
  { value: "11-50", label: "11 - 50 employees" },
  { value: "51-200", label: "51 - 200 employees" },
  { value: "201+", label: "201+ employees" },
];

const CreateOrgModal = ({ onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("Software & Technology");
  const [teamSize, setTeamSize] = useState("2-10");
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const { createOrg, loading } = useOrgStore();

  // Generate live slug preview
  const slugPreview = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP, or SVG).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Logo size must be less than 3MB.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const res = await createOrg({
        name: name.trim(),
        description: description.trim(),
        industry,
        teamSize,
        logo: logoPreview,
      });

      if (res.success) {
        toast.success(`Workspace "${name.trim()}" created!`);
        onClose();
      } else {
        const msg = res.message || "Failed to create workspace.";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      const msg = "Something went wrong while creating workspace.";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Create New Workspace" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Workspace Logo Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
            Workspace Logo{" "}
            <span className="text-zinc-400 dark:text-zinc-500 font-normal normal-case">
              (Optional)
            </span>
          </label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Workspace Logo"
                  className="w-13 h-13 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shadow-2xs"
                />
              ) : (
                <div className="w-13 h-13 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold text-lg flex items-center justify-center uppercase shadow-2xs">
                  {name.trim() ? name.trim().charAt(0) : "W"}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg
                    className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span>Upload Logo</span>
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                PNG, JPG, or SVG up to 3MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Workspace Name & Live Slug */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Workspace Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp or Engineering"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          />
          {slugPreview && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              URL Slug:{" "}
              <span className="text-zinc-900 dark:text-zinc-100 font-mono font-medium">
                orbithq.com/{slugPreview}
              </span>
            </p>
          )}
        </div>

        {/* Expected Team Size - Custom Dropdown */}
        <CustomSelect
          label="Expected Team Size"
          options={TEAM_SIZES}
          value={teamSize}
          onChange={setTeamSize}
        />

        {/* Industry / Category - Custom Dropdown */}
        <CustomSelect
          label="Industry / Category"
          options={INDUSTRIES}
          value={industry}
          onChange={setIndustry}
        />

        {/* Description / What they do */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Description / What your team does{" "}
            <span className="text-zinc-400 dark:text-zinc-500 font-normal normal-case">
              (Optional)
            </span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Building enterprise developer tools, AI workflows, and cloud applications"
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none"
            maxLength={500}
          />
        </div>

        {/* Submit Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading || !name.trim()}
            className="py-2.5 px-6 bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white text-white disabled:opacity-50 font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer flex items-center gap-2"
          >
            {(loading || uploading) && (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>
              {loading || uploading ? "Creating..." : "Create Workspace"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateOrgModal;