import Link from "next/link";

import { profile } from "@content/profile";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/70 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-neutral-900">{profile.fullName}</p>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {profile.headline} · {profile.location}
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {profile.socials.map((social) => (
            <li key={social.href}>
              <Link
                href={social.href}
                target={social.href.startsWith("http") ? "_blank" : undefined}
                rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                className="text-[13px] text-neutral-600 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
              >
                {social.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
