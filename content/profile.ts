 /**
 * Everything about you that isn't a project or the resume.
 * Edit this file and the whole site updates — hero, nav, footer, metadata, chat.
 */

export const profile = {
  name: "Ben Blair",
  fullName: "Benjamin Blair",
  /** The huge line in the hero. Keep it short — it renders at ~90px. */
  headline: "Software Engineer",
  /** The small line above the headline. */
  greeting: "Hey, I'm Ben",
  /** Faded wordmark bleeding off the bottom of the hero. */
  wordmark: "Blair",

  location: "Boulder, CO",
  age: 21,
  email: "1benblair@gmail.com",

  /** Hero portrait. Drop a file in public/ and point at it. Square images work best. */
  avatar: "/avatar-memoji-hd.webp",

  /** One or two sentences, used on the homepage and in social previews. */
  blurb:
    "Computer science undergrad at CU Boulder building real-time computer vision, embedded firmware, 3D capture pipelines, and production full-stack platforms — plus the occasional high-power rocket.",

  /**
   * The short hello that sits beside the photo — the first thing anyone reads.
   * Each string is a line; keep it to a handful, since the column next to a portrait is narrow.
   */
  intro: [
    "Hey 👋",
    "I'm Ben, a Computer Science junior at CU Boulder, class of 2027. I build software for physical systems — mmWave radar, computer vision on a Raspberry Pi, ESP32 firmware, and 3D scans you can spin around in a browser.",
    "This summer I built and self-hosted a full-stack operations platform that replaced a company's SaaS subscription, so I'm equally at home in Next.js and TypeScript.",
    "I'm looking for software engineering work with direct real-world impact.",
  ],

  /** The chips under the intro — what I'd want someone to remember in five seconds. */
  tags: [
    "Computer Vision",
    "Embedded",
    "Full-Stack",
    "3D / Gaussian Splatting",
    "CU Boulder",
    "Rocketry",
  ],

  /** Longer version for the About page. Each string is a paragraph. */
  about: [
    "I'm a junior studying Computer Science at the University of Colorado Boulder, graduating in 2027. Most of what I build sits where software meets the physical world: cameras, sensors, radar, rockets, and 3D scans of real objects.",
    "That's meant training anomaly detection models to run on a Raspberry Pi, mapping rooms with mmWave radar, writing ESP32 firmware in C++, and building Gaussian splatting pipelines to turn things I've made into models you can spin around in a browser — like the ones on this site.",
    "The other half is production software. This past summer I interned at Niguel Point Property Management, where I built and self-hosted a full-stack operations platform in Next.js and TypeScript that replaced the company's SaaS subscription, plus a Python scraping pipeline that runs in an ephemeral cloud sandbox and delivers 74 reports a week.",
    "I also founded Jesus Club CU, a student club at Boulder, which taught me as much about shipping and maintaining something people actually depend on as any codebase has.",
  ],

  /** What the contact page opens with, and what the Contact pill answers. One string, one paragraph. */
  contact: [
    "I'm looking for internships and new-grad roles where I can work on computer vision, 3D, embedded systems, or anything that touches real hardware. If that's you, I'd like to hear about it.",
    "Email is the fastest way to reach me. I read everything.",
  ],

  socials: [
    { label: "GitHub", href: "https://github.com/Ben-Blair" },
    { label: "Email", href: "mailto:1benblair@gmail.com" },
    { label: "Jesus Club CU", href: "https://jesusclubcu.com" },
  ],

  /**
   * The pills under the chat input — the site's only navigation, since there's no nav bar.
   *
   * A pill with a `panel` opens `/chat?panel=<panel>`, which answers inline instead of leaving
   * the chat; the panel then links on to `href`, the full page behind the same content. Drop the
   * `panel` and the pill goes straight to `href`.
   *
   * Projects is the one that does that. It has a page built to be browsed rather than summarized,
   * so instead of answering in the chat and then sending you on, it plays the same turn — the
   * question, the thinking beat, the answer — at the top of `/projects` itself, where the answer
   * can point down at the sections it's describing. `?ask=1` is what asks for that turn; without
   * it the page is just the page.
   *
   * Adding a panel means adding a matching entry in `src/components/chat/blocks/panels.tsx`.
   * `color` tints just the icon.
   */
  pills: [
    { label: "Me", icon: "smile", panel: "me", href: "/about", color: "#329696" },
    { label: "Projects", icon: "briefcase", href: "/projects?ask=1", color: "#3e9858" },
    { label: "Skills", icon: "layers", panel: "skills", href: "/skills", color: "#866eda" },
    { label: "Fun", icon: "party", panel: "fun", href: "/fun", color: "#ba5f9d" },
    { label: "Contact", icon: "user-search", panel: "contact", href: "/contact", color: "#c19433" },
  ],

  /** The /fun page. Rewrite these in your own voice — they're a starting point, not a spec. */
  fun: [
    {
      title: "I fly high-power rockets",
      body: "Designing, building, and launching them — which is mostly a lesson in how many ways a thing can go wrong before it goes up. The writeup is under Projects.",
    },
    {
      title: "I scan real objects into the browser",
      body: "Gaussian splatting turns a few minutes of phone video into something you can spin around on a webpage. Half the models on this site started as things sitting on my desk.",
    },
    {
      title: "I started a club",
      body: "Jesus Club CU at Boulder. Founding it taught me more about shipping and maintaining something people actually rely on than most of my code has.",
    },
  ],

  /** Shown under the chat input as one-tap starters. */
  suggestedPrompts: [
    "What's the coolest thing you've built?",
    "Walk me through your rocket project.",
    "What are you looking for right now?",
    "Do you have experience with computer vision?",
  ],
} as const;

export type Profile = typeof profile;
