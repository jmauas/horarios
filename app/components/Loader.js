export default function Loader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/30 backdrop-blur-sm">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
    </div>
  );
}