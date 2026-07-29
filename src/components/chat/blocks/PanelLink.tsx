import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * The way out of a panel and onto the full page behind it. Every panel ends with one, so the
 * inline answer is a preview rather than a replacement for `/about`, `/skills` and the rest.
 */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full px-1 text-[14px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
    >
      {children}
      <ArrowUpRight className="size-4 opacity-60" />
    </Link>
  );
}
