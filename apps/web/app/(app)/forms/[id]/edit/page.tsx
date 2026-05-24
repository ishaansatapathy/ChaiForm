import EditFormContent from "./edit-form-content";
import { fetchFormById } from "~/lib/fetch-session";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = await params;
  const initialForm = await fetchFormById(formId);

  return <EditFormContent formId={formId} initialForm={initialForm} />;
}
