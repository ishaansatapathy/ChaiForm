import type { DraftField } from "~/components/forms/form-builder-fields";
import type { FormThemeId } from "~/lib/form-themes";

export type FormTemplate = {
  id: string;
  label: string;
  description: string;
  theme: FormThemeId;
  title: string;
  formDescription: string;
  fields: DraftField[];
};

const COURSE_OPTIONS = [
  "B.Tech (Computer Science)",
  "B.Tech (Information Technology)",
  "B.Tech (Electronics & Communication)",
  "BCA",
  "MCA",
  "B.Sc (Computer Science)",
  "M.Tech",
  "MBA",
  "BBA",
  "Other",
];

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "customer-feedback",
    label: "Customer feedback",
    description: "Ratings, categories, dates & consent — all field types",
    theme: "default",
    title: "Customer feedback",
    formDescription: "Help us improve. Share your experience — takes under 2 minutes.",
    fields: [
      {
        id: "00000000-0000-4000-8000-000000000101",
        label: "Full name",
        type: "text",
        required: true,
        config: { placeholder: "Your full name" },
      },
      {
        id: "00000000-0000-4000-8000-000000000102",
        label: "Email address",
        type: "email",
        required: true,
        config: { placeholder: "you@company.com" },
      },
      {
        id: "00000000-0000-4000-8000-000000000103",
        label: "Feedback category",
        type: "select",
        required: true,
        config: {
          options: ["Product quality", "Customer support", "Delivery", "Pricing", "Feature request", "Other"],
          placeholder: "Select a category",
        },
      },
      {
        id: "00000000-0000-4000-8000-000000000104",
        label: "Overall experience rating",
        type: "rating",
        required: true,
        config: { maxRating: 5 },
      },
      {
        id: "00000000-0000-4000-8000-000000000105",
        label: "Date of experience",
        type: "date",
        required: false,
      },
      {
        id: "00000000-0000-4000-8000-000000000106",
        label: "Order / ticket ID (optional)",
        type: "number",
        required: false,
        config: { placeholder: "e.g. 10482" },
      },
      {
        id: "00000000-0000-4000-8000-000000000107",
        label: "Detailed feedback",
        type: "text",
        required: true,
        config: { placeholder: "Tell us what went well or what we should fix…" },
      },
      {
        id: "00000000-0000-4000-8000-000000000108",
        label: "Would recommend us",
        type: "checkbox",
        required: true,
        config: { checkboxLabel: "I would recommend this product/service to others" },
      },
      {
        id: "00000000-0000-4000-8000-000000000109",
        label: "Contact permission",
        type: "checkbox",
        required: false,
        config: { checkboxLabel: "You may contact me about this feedback" },
      },
    ],
  },
  {
    id: "campus-recruitment",
    label: "Campus recruitment",
    description: "Resume URL, course (B.Tech/BCA/MCA…) & role apply",
    theme: "startup",
    title: "Campus recruitment application",
    formDescription: "Apply for internships and full-time roles. Upload resume link and select your course.",
    fields: [
      {
        id: "00000000-0000-4000-8000-000000000201",
        label: "Full name",
        type: "text",
        required: true,
        config: { placeholder: "As on resume" },
      },
      {
        id: "00000000-0000-4000-8000-000000000202",
        label: "Email address",
        type: "email",
        required: true,
        config: { placeholder: "you@college.edu" },
      },
      {
        id: "00000000-0000-4000-8000-000000000203",
        label: "Phone number",
        type: "number",
        required: true,
        config: { placeholder: "10-digit mobile number" },
      },
      {
        id: "00000000-0000-4000-8000-000000000204",
        label: "Course / Degree",
        type: "select",
        required: true,
        config: {
          options: COURSE_OPTIONS,
          placeholder: "Select your course",
        },
      },
      {
        id: "00000000-0000-4000-8000-000000000205",
        label: "Graduation year",
        type: "number",
        required: true,
        config: { placeholder: "e.g. 2026" },
      },
      {
        id: "00000000-0000-4000-8000-000000000206",
        label: "Role applying for",
        type: "select",
        required: true,
        config: {
          options: ["Software Engineer Intern", "Full Stack Developer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "UI/UX Designer"],
        },
      },
      {
        id: "00000000-0000-4000-8000-000000000207",
        label: "Resume URL",
        type: "text",
        required: true,
        config: { placeholder: "https://drive.google.com/… or https://linkedin.com/in/…" },
      },
      {
        id: "00000000-0000-4000-8000-000000000208",
        label: "LinkedIn profile URL",
        type: "text",
        required: false,
        config: { placeholder: "https://linkedin.com/in/your-profile" },
      },
      {
        id: "00000000-0000-4000-8000-000000000209",
        label: "Portfolio / GitHub URL",
        type: "text",
        required: false,
        config: { placeholder: "https://github.com/yourusername" },
      },
      {
        id: "00000000-0000-4000-8000-000000000210",
        label: "Technical confidence (1–10)",
        type: "rating",
        required: true,
        config: { maxRating: 10 },
      },
      {
        id: "00000000-0000-4000-8000-000000000211",
        label: "Available to join from",
        type: "date",
        required: true,
      },
      {
        id: "00000000-0000-4000-8000-000000000212",
        label: "Details confirmation",
        type: "checkbox",
        required: true,
        config: { checkboxLabel: "I confirm all details and URLs shared are correct" },
      },
      {
        id: "00000000-0000-4000-8000-000000000213",
        label: "Open to relocation",
        type: "checkbox",
        required: false,
        config: { checkboxLabel: "I am open to relocation" },
      },
    ],
  },
];

export { COURSE_OPTIONS };
