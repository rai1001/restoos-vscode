import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] text-white">
      <h1 className="text-6xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-lg text-gray-400">
        Esta página no existe o fue movida.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-[#B8906F] px-6 py-3 text-sm font-medium text-[#090909] transition-opacity hover:opacity-90"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
