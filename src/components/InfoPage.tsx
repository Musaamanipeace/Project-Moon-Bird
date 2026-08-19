import React from "react";
import { Shield, Sparkles, BookOpen } from "lucide-react";

interface InfoPageProps {
  page: "policy" | "guidelines" | "about";
}

const CONTENT: Record<
  InfoPageProps["page"],
  { icon: React.ReactNode; title: string; paragraphs: string[] }
> = {
  policy: {
    icon: <Shield className="w-4 h-4 inline mr-1.5" />,
    title: "Platform Policy",
    paragraphs: [
      "Project-moonrise is built around anonymous identity. You are never required to reveal your real name, email, or phone number. Your cosmic nickname is a self-assigned identifier that you can change at any time.",
      "We operate with zero telemetry. We do not silently track your clicks, keystrokes, or browsing behavior to build advertising profiles. The only data we keep is what you explicitly choose to share inside the workspace.",
      "Anonymous passes give you a lightweight, rotating credential that unlocks community features without linking back to you. Reissue or regenerate your pass whenever you like to cycle your ledger slot.",
      "We do not sell your data. Ever. There are no third-party data brokers, no hidden ad-tech pipelines, and no resale of your activity to outside parties.",
      "Your nickname is fully user-controlled. Customize it, regenerate it, or leave it as the anonymous default — the choice is always yours.",
    ],
  },
  guidelines: {
    icon: <BookOpen className="w-4 h-4 inline mr-1.5" />,
    title: "Community Guidelines",
    paragraphs: [
      "Be respectful. Treat every citizen of the moonrise community with kindness. Disagreement is welcome; harassment, hate, or personal attacks are not.",
      "No spam. Keep feeds, chats, and challenge boards meaningful. Repeated self-promotion or irrelevant links will be removed.",
      "Give honest ad feedback. When you watch nature-conscious campaigns, your honest reactions help surface better resources for everyone. Share what genuinely helped you.",
      "Protect privacy. Do not post other people's personal information, and be mindful of what you reveal about yourself. Anonymity is the default here.",
      "Keep challenges constructive. Whether solo or group, focus on growth, learning, and support. Lift others as you rise through the lunar ranks.",
    ],
  },
  about: {
    icon: <Sparkles className="w-4 h-4 inline mr-1.5" />,
    title: "About Project-moonrise",
    paragraphs: [
      "Project-moonrise is a paywall-free platform that introduces citizens to greater awareness of their health, skills, and relationships through group challenges and shared discovery.",
      "Our vision is simple: help people notice the small, meaningful patterns in their lives — the phases of their wellbeing, the skills they are building, and the relationships that sustain them — the same way we watch the Moon move across the sky.",
      "We believe discovery should be free. Community-recommended resources — courses, books, products, and channels — are surfaced without paywalls, so anyone can learn and grow regardless of means.",
      "We are launching first in Kenya and across Africa, building a constellation of local communities connected by curiosity, mutual support, and a shared love of the night sky.",
    ],
  },
};

export default function InfoPage({ page }: InfoPageProps) {
  const content = CONTENT[page];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-slate-300 leading-relaxed">
      <h1 className="text-turquoise font-mono uppercase tracking-wider text-sm mb-5 flex items-center">
        {content.icon}
        {content.title}
      </h1>
      <div className="space-y-4">
        {content.paragraphs.map((p, i) => (
          <p key={i} className="text-sm">{p}</p>
        ))}
      </div>
    </div>
  );
}
