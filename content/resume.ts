/**
 * Structured resume, transcribed from Benjamin_Blair_Resume.pdf.
 *
 * Two things to keep in sync when you update your resume:
 *  1. Drop the new PDF at `public/BenjaminBlair_Resume.pdf` (same filename, overwrite).
 *  2. Update this file so the HTML version and the AI chat know about the change.
 */

export const resume = {
  /** Path under public/. Used by the Download button and the inline viewer. */
  pdf: "/BenjaminBlair_Resume.pdf",
  /** Filename the browser saves as. */
  downloadAs: "Benjamin_Blair_Resume.pdf",
  /** Shown as "Updated <this>" — bump it when you swap the PDF. */
  updated: "October 2026",

  /** Short enough to sit on one line under a heading, and in a chip. */
  headline: "CS @ CU Boulder, Class of 2027",

  summary:
    "Computer Science student building software for physical systems — real-time sensor processing, computer vision, embedded firmware, and production full-stack platforms. Experience spans C++ firmware on microcontrollers to cloud-deployed TypeScript services, with a track record of owning projects end to end and shipping to real users. Seeking software engineering work with direct real-world impact.",

  education: [
    {
      school: "University of Colorado Boulder",
      degree: "B.S. Computer Science",
      start: "August 2024",
      end: "May 2027",
      detail: "Major GPA 3.7 · Planning to continue into an M.S. in Computer Science",
      coursework: [
        "Design & Analysis of Algorithms",
        "Data Structures",
        "Computer Systems Architecture",
        "Database Systems",
        "Advanced Programming Languages",
        "Software Engineering",
        "Software Development Methods & Tools",
        "Introduction to Robotics",
        "Human–Computer Interaction",
        "Linear Algebra",
        "Calculus I–II",
        "Discrete Mathematics",
        "Physics I–II",
        "Object-Oriented Analysis and Design",
        "Intro to Cybersecurity",
      ],
    },
  ],

  experience: [
    {
      role: "Founder, Product Manager & Technical Lead",
      org: "HiveAI — Defense Technology Startup & Senior Capstone Project",
      /** Empty rather than absent: every entry carries the same keys, so `entry.href` typechecks. */
      href: "",
      start: "September 2026",
      end: "Present",
      bullets: [
        "Founded HiveAI and lead its 4-engineer team; the only student of 45 in the senior capstone cohort whose original concept was approved and staffed (all other projects were sponsor-proposed).",
        "Multi-camera platform for military and law-enforcement after-action review: combines unsynchronized body-worn, weapon-mounted, handheld, fixed, and drone footage into a single 3D replay of the engagement, viewable from any angle.",
        "GPS-independent localization: recovers every camera's position and heading, and so every operator's, by structure-from-motion over the footage itself, then reconstructs the site as a photorealistic 3D Gaussian-splat model without a pre-surveyed map.",
        "Sub-frame time sync: aligns all sources to one clock within a single video frame (33ms) via GCC-PHAT audio cross-correlation and a weighted least-squares solve across every camera pair.",
        "Cross-camera tracking: detects people (YOLO, SAM), triangulates anyone seen by multiple cameras, and keeps identities consistent through occlusions with a global offline solver rather than frame-by-frame guessing.",
        "Evidentiary integrity: SHA-256 chain of custody on all source footage and an error bound on every position; areas no camera captured are filled by a diffusion model and visibly marked as AI-generated, and uncertain identity matches go to an analyst instead of being auto-resolved.",
      ],
    },
    {
      role: "Full-Stack Software Engineer Intern",
      org: "Niguel Point Property Management",
      href: "",
      /** No `end` — the PDF dates this one "Summer 2026", not as a range. */
      start: "Summer 2026",
      end: "",
      bullets: [
        "Built and self-hosted a full-stack business-operations platform that replaced the company's third-party SaaS subscription, eliminating ~$3,400/year in recurring fees across the team.",
        "Developed the platform in Next.js 16 / React 19 / TypeScript (~16K LOC, 20+ feature modules) on Supabase — Postgres with row-level security, Google OAuth, object storage — with Tailwind CSS v4 and Recharts dashboards.",
        "Engineered an automated reporting service that scrapes 6 external systems via Playwright headless-browser automation (~2,300 lines of Python) and delivers 4 seller and 70 listing reports weekly, replacing a full employee's worth of recurring manual work.",
        "Designed a serverless cloud execution model running the scraping pipeline in an ephemeral Vercel Sandbox (Firecracker microVM), dispatched detached and reporting results through a token-authenticated async HTTP callback.",
        "Implemented AES-256-GCM encrypted credential storage, TOTP-based automated 2FA re-login with self-refreshing session cookies, and dual-factor callback authentication.",
        "Instrumented run metrics and structured logs to monitor pipeline health, triage failures, and root-cause scraper breakages; shipped behind Vitest suites, Husky/lint-staged pre-commit hooks, and GitHub Actions CI.",
      ],
    },
  ],

  /** The "Projects" section of the PDF. Deeper writeups live in content/projects/. */
  projects: [
    {
      name: "Real-Time Indoor Presence & Location Tracker",
      stack: "C++, TypeScript",
      slug: "presence-scan",
      bullets: [
        "Wrote custom embedded firmware in C++ (ESP32-C3, PlatformIO/Arduino) that parses raw HLK-LD2450 mmWave radar frames over UART and streams up to 3 tracked targets in real time as JSON over an on-device WebSocket server.",
        "Implemented an autonomous simulation mode using an 8-connected A* search algorithm (octile heuristic) with multi-agent obstacle avoidance over an occupancy grid derived from a splat point cloud; smoothed live radar jitter with a per-target One Euro adaptive filter.",
        "Produced a photorealistic 3D asset end to end with COLMAP structure-from-motion and a locally trained 3D Gaussian Splatting model (Rust/wgpu), owning the pipeline from capture through real-time in-browser rendering.",
        "Rendered each tracked person as an animated avatar depth-occluded by the 3D scan in PlayCanvas (WebGL2/WebGPU) with custom Gaussian-splat shaders in GLSL and WGSL. (~4,900 LOC, 8 Vitest suites, GitHub Actions CI/CD)",
      ],
    },
    {
      name: "Smart-Room Security & Automation System",
      stack: "Python, Raspberry Pi",
      slug: "video-monitoring",
      bullets: [
        "Owned the full ML pipeline for an unsupervised Anomalib PatchCore (PyTorch) anomaly-detection model — dataset capture, preprocessing, training, inference — and calibrated detection thresholds with hysteresis and multi-frame confirmation to cut false positives on ROI-cropped frames.",
        "Built a real-time acoustic event-detection service using YAMNet (TensorFlow Lite) that classifies a target sound from a live microphone stream over overlapping 1s/0.5s-hop windows and triggers a weather-conditioned spoken response via A2DP/PipeWire, exposed through a Flask REST API and React dashboard.",
        "Engineered an always-on computer-vision security system (Motion daemon, 1280x720 @ 15fps) that selects the clearest intruder face via a two-pass sparse-then-dense scan and OpenCV YuNet DNN face detection with CLAHE low-light normalization, then auto-emails an HTML alert; archived clips to cloud storage with a two-pass H.264/FFmpeg re-encoder that budgets bitrate per clip against a hard 50MB cap.",
      ],
    },
  ],

  /** Activities, leadership, and certifications — the parts of the PDF that aren't jobs. */
  activities: [
    {
      name: "CU Boulder Design/Build/Fly (AIAA DBF)",
      org: "Avionics Team — Firmware & Telemetry",
      when: "August 2026 – Present",
      detail:
        "Develop firmware and telemetry systems for an unmanned, remote-controlled aircraft built for the AIAA Design/Build/Fly intercollegiate competition, supporting systems integration and flight testing.",
    },
    {
      name: "Level 1 High-Power Rocketry Certification",
      org: "Tripoli Rocketry Association",
      when: "Summer 2026",
      detail: "Built, flew, and recovered a high-power rocket to earn Level 1 certification.",
    },
    {
      name: "STEPCon",
      org: "Presenter",
      detail:
        "Led a team building a Titanic survival-prediction model with feature engineering, logistic regression, random forest, SVM, and XGBoost under cross-validation; achieved 79.4% accuracy, top 12% on the Kaggle competition.",
    },
    {
      name: "Circuit Workshop",
      org: "Teaching Assistant",
      detail: "Guided participants through hands-on electronics exercises.",
    },
  ],

  skills: [
    {
      group: "Languages",
      items: ["Python", "C++", "TypeScript", "JavaScript", "Java", "SQL"],
    },
    {
      group: "Algorithms & Systems",
      items: [
        "Data structures",
        "Search & pathfinding",
        "Multi-camera geometry & triangulation",
        "Structure-from-motion",
        "Audio cross-correlation time sync",
        "Real-time signal filtering",
        "Embedded firmware (ESP32/PlatformIO)",
        "Raspberry Pi",
        "mmWave radar over UART",
        "WebSockets",
      ],
    },
    {
      group: "ML & Computer Vision",
      items: [
        "PyTorch",
        "TensorFlow/TFLite",
        "OpenCV",
        "YOLO",
        "SAM",
        "scikit-learn",
        "NumPy",
        "Pandas",
      ],
    },
    {
      group: "Graphics & Sensing",
      items: [
        "WebGL/WebGPU",
        "GLSL/WGSL",
        "PlayCanvas",
        "3D Gaussian Splatting",
        "COLMAP photogrammetry",
      ],
    },
    {
      group: "Front-End Frameworks",
      items: ["React", "Next.js", "Tailwind CSS", "Recharts"],
    },
    {
      group: "Backend & Storage Systems",
      items: [
        "Node.js",
        "Flask",
        "REST APIs",
        "PostgreSQL",
        "Supabase",
        "AES-256 encryption",
        "OAuth/TOTP",
      ],
    },
    {
      group: "Cloud Infrastructure & Tooling",
      items: [
        "Vercel serverless / Firecracker microVMs",
        "Docker",
        "CUDA cloud GPUs",
        "GitHub Actions CI/CD",
        "Git",
        "Playwright",
        "Vitest",
        "pytest",
        "FFmpeg",
      ],
    },
  ],
} as const;

export type Resume = typeof resume;
