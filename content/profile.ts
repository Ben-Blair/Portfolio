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
  phone: "9494497749",

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
    { label: "Me", icon: "smile", panel: "me", href: "/chat?panel=me", color: "#329696" },
    { label: "Projects", icon: "briefcase", href: "/projects?ask=1", color: "#3e9858" },
    { label: "Skills", icon: "layers", panel: "skills", href: "/skills", color: "#866eda" },
    { label: "Fun", icon: "party", panel: "fun", href: "/chat?panel=fun", color: "#ba5f9d" },
    { label: "Contact", icon: "user-search", panel: "contact", href: "/contact", color: "#c19433" },
  ],

  /**
   * The Fun panel at `/chat?panel=fun`. One subject rather than a list of them — the answer to
   * "what do you do for fun" is filming trips, so the panel is one of those films and the reason
   * for it.
   *
   * The cut lives on YouTube, not in `public/`: it runs two and a half minutes with sound, which
   * is tens of megabytes self-hosted and a slow first load for every visitor. Streaming it means
   * only what gets watched is ever sent.
   *
   * It plays on its own, on a loop, muted — the volume button on the player is how sound gets
   * turned on, and has to be, since no browser will autoplay audio unprompted.
   */
  fun: {
    title: "Summer Highlights",
    body: [
      "Anywhere I travel, the camera comes with me. This one is the drive home from Boulder to Southern California — up into Wyoming, down through Utah, across Nevada, then the last stretch along the coast. Mountains hiked on the way, nights camped out in the boonies, most of the west in between.",
      "Cutting it together is how I go back through the trip. It's the only thing I make where nothing has to work. It just has to look the way it felt.",
    ],
    video: {
      /** The `v=` parameter from the YouTube URL. */
      id: "P8Vvbgfopqs",
      title: "Summer",
      /** Match this to what was uploaded, or the player sits in black bars. */
      aspect: "6/5",
    },
  },

  /** Shown under the chat input as one-tap starters. */
  suggestedPrompts: [
    "What's the coolest thing you've built?",
    "Walk me through your rocket project.",
    "What are you looking for right now?",
    "Do you have experience with computer vision?",
  ],
} as const;

export type Profile = typeof profile;
