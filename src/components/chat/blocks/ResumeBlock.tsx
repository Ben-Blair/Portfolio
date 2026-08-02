import { Download, ExternalLink } from "lucide-react";

import { Fade } from "@/components/chat/reveal";
import { resume } from "@content/resume";

/**
 * The Resume panel: just the PDF itself, opened right in the answer — asking to *see* the resume
 * means the document, not a summary of it or a link to the read-through page that already
 * duplicates it.
 */
export function ResumeBlock() {
  return (
    <div>
      <Fade step={0} className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14.5px] text-neutral-500">
          {resume.headline} · Updated {resume.updated}
        </p>
        <div className="flex gap-2">
          <a
            href={resume.pdf}
            download={resume.downloadAs}
            className="glass-dark inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-white"
            data-glass
            suppressHydrationWarning
          >
            <Download className="size-3.5" />
            Download
          </a>
          <a
            href={resume.pdf}
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium text-neutral-700"
            data-glass
            suppressHydrationWarning
          >
            <ExternalLink className="size-3.5 text-neutral-400" />
            Open in new tab
          </a>
        </div>
      </Fade>

      <Fade step={1} className="mt-4">
        <object
          data={resume.pdf}
          type="application/pdf"
          className="h-[70vh] w-full rounded-2xl border border-neutral-200"
        >
          <p className="p-6 text-[15px] text-neutral-600">
            Your browser can&apos;t display PDFs inline.{" "}
            <a href={resume.pdf} download={resume.downloadAs} className="underline">
              Download it instead
            </a>
            .
          </p>
        </object>
      </Fade>
    </div>
  );
}
