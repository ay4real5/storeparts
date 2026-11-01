export default function Loading() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-5 px-4 sm:px-6 lg:px-10 py-10 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="card h-80" />
      ))}
    </div>
  );
}
