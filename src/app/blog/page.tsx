import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — RestoOS",
  description:
    "Artículos sobre gestión de restaurantes, food cost, APPCC digital y tecnología para hostelería en España.",
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <>
      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">
          Blog
        </p>
        <h1 className="text-3xl font-bold text-fg-strong tracking-tight mb-3">
          Gestión inteligente de restaurantes
        </h1>
        <p className="text-muted-light text-base leading-relaxed max-w-xl">
          Food cost, escandallos, APPCC, digitalización y todo lo que un jefe de
          cocina necesita saber para gestionar mejor su negocio.
        </p>
      </div>

      {/* Post grid */}
      {posts.length === 0 ? (
        <p className="text-muted">Próximamente: primeros artículos en camino.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-border bg-card p-6 hover:border-border-hover hover:bg-card-hover transition-all"
            >
              <div className="flex items-center gap-3 text-xs text-muted mb-3">
                <span className="uppercase tracking-wider font-semibold text-accent">
                  {post.category}
                </span>
                <span>·</span>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
                <span>·</span>
                <span>{post.readingTime}</span>
              </div>
              <h2 className="text-xl font-bold text-fg-strong group-hover:text-accent transition-colors mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-muted-light leading-relaxed">
                {post.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-md bg-white/[0.03] text-muted-light"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
