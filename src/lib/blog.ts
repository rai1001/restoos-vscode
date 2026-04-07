import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime: string;
}

export interface Post extends PostMeta {
  content: string;
}

function ensurePostsDir() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
}

export function getAllPosts(): PostMeta[] {
  ensurePostsDir();
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"));

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const stats = readingTime(content);

    return {
      slug,
      title: data.title ?? "",
      description: data.description ?? "",
      date: data.date ?? "",
      author: data.author ?? "Israel García",
      category: data.category ?? "General",
      tags: data.tags ?? [],
      image: data.image,
      readingTime: stats.text.replace("read", "lectura"),
    } satisfies PostMeta;
  });

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): Post | null {
  ensurePostsDir();
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  return {
    slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: data.date ?? "",
    author: data.author ?? "Israel García",
    category: data.category ?? "General",
    tags: data.tags ?? [],
    image: data.image,
    readingTime: stats.text.replace("read", "lectura"),
    content,
  };
}

export function getAllSlugs(): string[] {
  ensurePostsDir();
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
