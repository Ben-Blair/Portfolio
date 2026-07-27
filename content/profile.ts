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

  location: "Dana Point, CA",
  email: "ben0r0blair@gmail.com",

  /** Hero portrait. Drop a file in public/ and point at it. Square images work best. */
  avatar: "/avatar.svg",

  /** One or two sentences, used on the homepage and in social previews. */
  blurb:
    "Computer science undergrad at CU Boulder building real-time computer vision, embedded systems, and 3D capture pipelines — plus the occasional high-power rocket.",

  /** Longer version for the About page. Each string is a paragraph. */
  about: [
    "I'm a junior studying Computer Science at the University of Colorado Boulder, graduating in 2027. Most of what I build sits where software meets the physical world: cameras, sensors, radar, rockets, and 3D scans of real objects.",
    "That's meant training anomaly detection models to run on a Raspberry Pi, mapping rooms with mmWave radar, and building Gaussian splatting pipelines to turn things I've made into models you can spin around in a browser — like the ones on this site.",
    "I also founded Jesus Club CU, a student club at Boulder, which taught me as much about shipping and maintaining something people actually depend on as any codebase has.",
  ],

  socials: [
    { label: "GitHub", href: "https://github.com/Ben-Blair" },
    { label: "Email", href: "mailto:ben0r0blair@gmail.com" },
    { label: "Jesus Club CU", href: "https://jesusclubcu.com" },
  ],

  /** The pills under the hero input. `prompt` sends that text to the chat instead of navigating. */
  pills: [
    { label: "Me", icon: "smile", href: "/about" },
    { label: "Projects", icon: "briefcase", href: "/projects" },
    { label: "Skills", icon: "layers", prompt: "What are you good at?" },
    { label: "Fun", icon: "party", prompt: "Tell me something fun about you." },
    { label: "Contact", icon: "user-search", href: "/contact" },
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
