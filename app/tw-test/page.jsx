export default function TailwindTest() {
  return (
    <div className="p-6">
      <div className="p-4 bg-brand-600 text-white rounded-lg">
        Tailwind OK (brand-600)
      </div>
      <p className="mt-4 text-sm text-gray-600">
        If this box is green with white text, Tailwind is working.
      </p>
    </div>
  );
}
