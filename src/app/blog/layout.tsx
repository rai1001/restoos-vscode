import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Blog RestoOS",
    default: "Blog — RestoOS",
  },
  description:
    "Artículos sobre gestión de restaurantes, food cost, APPCC, digitalización y tecnología para hostelería.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <a href="/landing" className="text-xl font-bold text-fg-strong">
            Resto<span className="text-accent">OS</span>
          </a>
          <nav className="flex items-center gap-6 text-sm">
            <a href="/blog" className="text-accent font-medium">
              Blog
            </a>
            <a href="/landing" className="text-muted-light hover:text-fg transition-colors">
              Producto
            </a>
            <a
              href="/landing#pricing"
              className="bg-accent text-background px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Prueba RestoOS
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="mx-auto max-w-5xl px-6 py-8 flex items-center justify-between text-sm text-muted">
          <span>© 2026 RestoOS. Todos los derechos reservados.</span>
          <a href="/landing" className="hover:text-accent transition-colors">
            restoos.app
          </a>
        </div>
      </footer>
    </div>
  );
}
