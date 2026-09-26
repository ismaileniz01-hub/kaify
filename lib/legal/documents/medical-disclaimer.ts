import {
  LEGAL_ENTITY,
  MEDICAL_DISCLAIMER_VERSION,
  SUPPORT_EMAIL,
  TERMS_PATH,
} from "@/lib/legal/constants";
import type { LegalDocument } from "./types";

export const MEDICAL_DISCLAIMER_DOCUMENT: LegalDocument = {
  title: "Medical & Fitness Disclaimer",
  subtitle: `Last updated: August 21, 2026 · Version ${MEDICAL_DISCLAIMER_VERSION}`,
  intro: `This disclaimer applies to all Kaify content, coaches, plans, AI outputs, and analytics. It supplements the Terms of Service.`,
  sections: [
    {
      id: "not-medical",
      title: "1. Not medical care",
      blocks: [
        {
          type: "p",
          text: `${LEGAL_ENTITY} is not a healthcare provider, physician, dietitian regulated clinical service, physiotherapist, emergency service, insurer, or medical device manufacturer. Kaify does not diagnose, treat, prescribe, cure, or prevent disease.`,
        },
      ],
    },
    {
      id: "risks",
      title: "2. Inherent risks",
      blocks: [
        {
          type: "p",
          text: "Physical activity, nutrition changes, fasting, supplements, and related practices carry inherent risks of injury, illness, or adverse events. You participate voluntarily and assume ordinary risks to the extent permitted by law. Choose safe environments and appropriate intensity.",
        },
      ],
    },
    {
      id: "stop",
      title: "3. When to stop",
      blocks: [
        {
          type: "p",
          text: "Stop exercising and seek appropriate help if you feel pain, dizziness, faintness, chest discomfort, unusual shortness of breath, or other concerning symptoms. For emergencies call local emergency services. Do not message Kaify coaches for emergency care.",
        },
      ],
    },
    {
      id: "ai",
      title: "4. AI outputs",
      blocks: [
        {
          type: "p",
          text: "AI coaches may be wrong. Outputs are general wellness information, not individualized medical advice, and are not routinely reviewed by licensed clinicians.",
        },
      ],
    },
    {
      id: "professional",
      title: "5. Professional advice",
      blocks: [
        {
          type: "p",
          text: "Consult a qualified professional before starting or changing exercise or diet programs, especially if you are pregnant, injured, symptomatic, medicated, or managing a medical condition.",
        },
      ],
    },
    {
      id: "more",
      title: "6. More information",
      blocks: [
        {
          type: "p",
          text: `Full contractual terms: ${TERMS_PATH}. Questions: ${SUPPORT_EMAIL}.`,
        },
      ],
    },
  ],
};
