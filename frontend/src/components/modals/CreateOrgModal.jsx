import { useState, useRef } from "react";
import Modal from "../common/Modal";
import { useOrgStore } from "../../stores/orgStore";

const INDUSTRIES = [
  "Software & Tech",
  "Design & Creative",
  "Marketing & Agency",
  "E-Commerce & Retail",
  "Finance & Fintech",
  "Healthcare & Education",
  "Other",
];

const TEAM_SIZES = [
  { value: "1", label: "Just me", icon: "👤" },
  { value: "2-10", label: "2 - 10", icon: "👥" },
  { value: "11-50", label: "11 - 50", icon: "🚀" },
  { value: "51-200", label: "51 - 200", icon: "🏢" },
  { value: "201+", label: "201+", icon: "🌐" },
];

const CreateOrgModal = ({ onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("Software & Tech");
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

    // Limit to 3MB
    if (file.size > 3 * 1024 * 1024) {
      setError("Logo size should be under 3MB.");
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
        onClose();
      } else {
        setError(res.message || "Failed to create workspace.");
      }
    } catch (err) {
      setError("Something went wrong while creating workspace.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Create New Workspace" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Workspace Logo & Avatar Preview */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-2">
            Workspace Logo / Icon <span className="text-slate-400 dark:text-zinc-500 font-normal normal-case">(Optional)</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Workspace Logo"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-zinc-700 shadow-xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center uppercase shadow-xs">
                  {name.trim() ? name.trim().charAt(0) : "O"}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                >
                  📁 Upload Logo
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                PNG, JPG, or SVG up to 3MB. Auto-generates initial if empty.
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Workspace Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp, Engineering, or OrbitHQ"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {slugPreview && (
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
              URL Slug: <span className="text-blue-600 dark:text-blue-400 font-mono font-medium">orbithq.com/{slugPreview}</span>
            </p>
          )}
        </div>

        {/* Expected Team Size */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Expected Team Size <span className="text-slate-400 dark:text-zinc-500 font-normal normal-case">(Employees)</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {TEAM_SIZES.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => setTeamSize(tier.value)}
                className={`py-2 px-1 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  teamSize === tier.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="text-sm mb-0.5">{tier.icon}</div>
                <div>{tier.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Industry / Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Industry / Category
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Description / What they do */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Description / What your team does <span className="text-slate-400 dark:text-zinc-500 font-normal normal-case">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Building enterprise developer tools, AI workflows, and cloud applications"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            maxLength={500}
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading || !name.trim()}
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer flex items-center gap-2"
          >
            {(loading || uploading) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {loading || uploading ? "Creating..." : "Create Workspace"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateOrgModal;