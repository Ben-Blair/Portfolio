import type { Metadata } from "next";
import { Download, ExternalLink } from "lucide-react";

import { BackHome } from "@/components/site/BackHome";
import { resume } from "@content/resume";

export const metadata: Metadata = {
  title: "Resume",
  description: resume.summary,
};

/**
 * The PDF itself — nothing reformatted alongside it. A second, hand-laid-out copy of the same
 * text is a second thing that can drift out of sync with the actual document; the PDF is the
 * resume.
 *
 * To update: overwrite `public/BenjaminBlair_Resume.pdf` and edit `resume.headline`/`resume.updated`.
 */
export default function ResumePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <BackHome />

      <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
            Resume
          </h1>
          <p className="mt-3 text-[15px] text-neutral-500">
            {resume.headline} · Updated {resume.updated}
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={resume.pdf}
            download={resume.downloadAs}
            className="glass-dark inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-white"
            data-glass
            suppressHydrationWarning
          >
            <Download className="size-3.5" />
            Download PDF
          </a>
          <a
            href={resume.pdf}
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-neutral-700"
            data-glass
            suppressHydrationWarning
          >
            <ExternalLink className="size-3.5 text-neutral-400" />
            Open
          </a>
        </div>
      </header>

      <object
        data={resume.pdf}
        type="application/pdf"
        className="mt-10 h-[85vh] w-full rounded-2xl border border-neutral-200"
      >
        <p className="p-6 text-[15px] text-neutral-600">
          Your browser can&apos;t display PDFs inline.{" "}
          <a href={resume.pdf} download={resume.downloadAs} className="underline">
            Download it instead
          </a>
          .
        </p>
      </object>
    </div>
  );
}
