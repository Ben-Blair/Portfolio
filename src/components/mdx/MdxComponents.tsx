import Link from "next/link";
import type { MDXComponents } from "mdx/types";

import { MediaBlock } from "@/components/media/MediaBlock";
import { mediaSchema } from "@/lib/schema";

/**
 * Components available inside any `content/projects/*.mdx` body.
 *
 * Add one here and you can use it in every project write-up without importing anything.
 */

/** A callout. Usage: `<Note>text</Note>` */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <aside className="not-prose my-6 rounded-2xl border border-neutral-200 bg-neutral-50/70 px-5 py-4 text-[15px] leading-relaxed text-neutral-600">
      {children}
    </aside>
  );
}

/**
 * Drop a single media item mid-paragraph rather than in the frontmatter list.
 * Usage: `<Media type="youtube" id="abc123" title="Launch" />`
 */
function Media(props: Record<string, unknown>) {
  const parsed = mediaSchema.safeParse(props);
  if (!parsed.success) {
    return (
      <aside className="not-prose my-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
        Invalid &lt;Media&gt;: {parsed.error.issues.map((i) => i.message).join("; ")}
      </aside>
    );
  }
  return (
    <div className="not-prose my-8">
      <MediaBlock media={parsed.data} />
    </div>
  );
}

export const mdxComponents: MDXComponents = {
  Note,
  Media,
  // Internal links go through the router; external ones open in a new tab.
  a: ({ href = "", children, ...rest }) => {
    const external = /^https?:\/\//.test(href);
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    ) : (
      <Link href={href}>{children}</Link>
    );
  },
};
