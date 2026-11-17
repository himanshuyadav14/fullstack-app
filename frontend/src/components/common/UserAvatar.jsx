const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl",
};

/**
 * Profile picture if the user has one, otherwise their initial.
 */
const UserAvatar = ({ user, size = "sm", className = "" }) => {
  const sizeClass = SIZES[size] || SIZES.sm;
  const name = user?.name || "User";

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={name}
        title={name}
        className={`${sizeClass} rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${sizeClass} rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold flex items-center justify-center uppercase shrink-0 ${className}`}
    >
      {name.charAt(0)}
    </div>
  );
};

export default UserAvatar;
