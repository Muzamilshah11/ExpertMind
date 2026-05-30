export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900">
      <h1 className="text-4xl font-bold mb-8 text-slate-100">Welcome to ExpertMind</h1>
      <p className="text-lg mb-8 text-slate-400">Your elite multimodal AI consultant.</p>
      <a href="/session" className="px-6 py-3 bg-blue-600 text-white rounded-lg text-xl hover:bg-blue-700 transition-colors">
        Start Session
      </a>
    </div>
  );
}
