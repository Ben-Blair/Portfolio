import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { Hero } from "@/components/hero/Hero";
import { getFeaturedProjects } from "@/lib/content";
import { profile } from "@content/profile";

export default function HomePage() {
  const featured = getFeaturedProjects();

  return (
    <>
      <Hero />

      <FeaturedProjects projects={featured} />

      <section className="border-t border-neutral-200/70 bg-neutral-50/50">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight tracking-[-0.035em]">
            Currently looking for internships
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-neutral-600">
            {profile.blurb}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Get in touch
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/resume"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-6 py-3 text-[15px] font-medium text-neutral-700 transition-colors hover:border-neutral-300"
            >
              Resume
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
