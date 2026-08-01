import type { Metadata } from "next";

import { BackHome } from "@/components/site/BackHome";
import { profile } from "@content/profile";

export const metadata: Metadata = {
  title: "Fun",
  description: `The non-resume parts of ${profile.fullName}.`,
};

/** Content lives in `profile.fun` in `content/profile.ts`. */
export default function FunPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <BackHome />

      <h1 className="mt-8 font-display text-[clamp(2.25rem,6vw,3.25rem)] font-extrabold leading-none tracking-[-0.04em]">
        Fun
      </h1>
      <p className="mt-3 text-[15px] text-neutral-500">The parts that aren&apos;t on a resume.</p>

      <div className="mt-12 space-y-10">
        {profile.fun.map((item) => (
          <section key={item.title}>
            <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
              {item.title}
            </h2>
            <p className="mt-2.5 text-[17px] leading-relaxed text-neutral-700">{item.body}</p>
          </section>
        ))}
      </div>

    </div>
  );
}
