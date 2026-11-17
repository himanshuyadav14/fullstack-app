// Shown while a lazily loaded page's code is being fetched
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center py-32">
    <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default PageLoader;
