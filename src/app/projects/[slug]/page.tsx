import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";

import { MediaList } from "@/components/media/MediaBlock";
import { Badge } from "@/components/ui/badge";
import { mdxComponents } from "@/components/mdx/MdxComponents";
import { getProject, getProjects } from "@/lib/content";

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.tagline,
    openGraph: {
      title: project.title,
      description: project.tagline,
      images: project.cover ? [{ url: project.cover }] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const { content } = await compileMDX({
    source: project.body,
    components: mdxComponents,
    options: { parseFrontmatter: false },
  });

  const formattedDate = new Date(project.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ArrowLeft className="size-3.5" />
        All projects
      </Link>

      <header className="mt-8">
        <p className="font-mono text-[12px] tracking-widest text-neutral-400">
          {formattedDate}
          {project.status && <span className="ml-3">· {project.status}</span>}
        </p>

        <h1 className="mt-3 font-display text-[clamp(2.25rem,6vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-neutral-900">
          {project.title}
        </h1>

        <p className="mt-4 text-[18px] leading-relaxed text-neutral-600">{project.tagline}</p>

        <ul className="mt-6 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="rounded-full font-normal">
                {tag}
              </Badge>
            </li>
          ))}
        </ul>

        {project.links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {project.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-[13.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                {link.label}
                <ArrowUpRight className="size-3.5 text-neutral-400" />
              </a>
            ))}
          </div>
        )}
      </header>

      {project.media.length > 0 && (
        <div className="mt-12">
          <MediaList media={project.media} />
        </div>
      )}

      <div className="prose prose-neutral mt-12 max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-a:text-neutral-900 prose-a:underline-offset-4">
        {content}
      </div>
    </article>
  );
}
