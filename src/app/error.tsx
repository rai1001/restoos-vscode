"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] text-white">
      <h1 className="text-4xl font-bold tracking-tight">Algo salió mal</h1>
      <p className="mt-4 text-lg text-gray-400">
        Error inesperado. Inténtalo de nuevo.
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-lg bg-[#B8906F] px-6 py-3 text-sm font-medium text-[#090909] transition-opacity hover:opacity-90"
      >
        Reintentar
      </button>
    </div>
  );
}
