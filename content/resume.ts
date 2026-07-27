/**
 * Structured resume, transcribed from BenjaminBlair_Resume.pdf.
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
  updated: "July 2026",

  headline: "Junior-level Computer Science Undergraduate, Class of 2027",

  summary:
    "Junior-level Computer Science undergraduate with hands-on experience in machine learning, data analysis, and software development. Skilled in building and deploying models using Python, OpenCV, and Scikit-Learn, with practical experience in real-time data processing and modular system design. I really like building cool projects and would love to get my hands dirty with real-life work experience.",

  education: [
    {
      school: "University of Colorado Boulder",
      degree: "Bachelor of Science in Computer Science",
      start: "August 2024",
      end: "May 2027",
      detail: "GPA 3.60",
    },
  ],

  experience: [
    {
      role: "Founder",
      org: "Jesus Club CU",
      href: "https://jesusclubcu.com",
      start: "2024",
      end: "Present",
      bullets: [
        "Founded and run a student club at CU Boulder, including building and maintaining its website.",
      ],
    },
  ],

  /** The "Top Projects" section of the PDF. Deeper writeups live in content/projects/. */
  projects: [
    {
      name: "Real-Time Video Monitoring & Detection System",
      stack: "Python, OpenCV, Haar Cascade, PatchCore (Anomalib), PyTorch, Git, Raspberry Pi",
      slug: "video-monitoring",
      bullets: [
        "Designed and implemented a real-time video processing pipeline for object detection in live camera feeds. Integrated Haar Cascade classifiers and tuned preprocessing parameters for reliable detection.",
        "Extended the system with a deep learning–based anomaly detection module using PatchCore (via Anomalib, built on PyTorch) to classify whether a bed was made or unmade.",
        "Built and deployed an end-to-end inference pipeline, including dataset collection, model training, feature extraction, and threshold calibration for anomaly scoring.",
        "Optimized model inference for edge deployment, adapting to Raspberry Pi resource constraints. Implemented video stream encryption for secure transmission and storage.",
        "Structured the system into modular components (data ingestion, preprocessing, inference, alerting), improving maintainability, debugging, and testing.",
      ],
    },
    {
      name: "Bird Dropper — Cloud-Ready Bird Tracking Web Application",
      stack: "JavaScript, Node.js, PostgreSQL, Docker, Render, Git",
      slug: "bird-dropper",
      bullets: [
        "Developed a modular full-stack web application for tracking bird sightings with user accounts, photo uploads, and interactive feeds.",
        "Designed and implemented REST APIs for scalable backend services.",
        "Containerized with Docker and deployed to Render, demonstrating cloud-native architecture.",
        "Implemented secure authentication and cloud media storage for reliability and maintainability.",
      ],
    },
  ],

  skills: [
    {
      group: "Programming Languages",
      items: ["C++", "Python", "Java", "JavaScript", "HTML", "CSS"],
    },
    {
      group: "Software Development & Tools",
      items: [
        "Git",
        "Docker",
        "REST APIs",
        "Modular Design",
        "Unit Testing",
        "Cloud Deployment",
        "Raspberry Pi",
      ],
    },
    {
      group: "Other Tools & Technologies",
      items: ["Excel", "OpenCV", "Scikit-Learn", "MATLAB", "Matplotlib", "AutoCAD"],
    },
  ],
} as const;

export type Resume = typeof resume;
