"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export type FieldType = "text" | "email" | "number" | "select" | "rating" | "date";

export interface DraftField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  config?: {
    options?: string[];
    maxRating?: number;
    placeholder?: string;
  };
}

const FIELD_TYPES: FieldType[] = ["text", "email", "number", "select", "rating", "date"];

function defaultConfig(type: FieldType): DraftField["config"] {
  if (type === "select") return { options: ["Option 1", "Option 2"] };
  if (type === "rating") return { maxRating: 5 };
  return undefined;
}

function newFieldId() {
  return crypto.randomUUID();
}

interface FormBuilderFieldsProps {
  fields: DraftField[];
  onChange: (fields: DraftField[]) => void;
}

export function FormBuilderFields({ fields, onChange }: FormBuilderFieldsProps) {
  const addField = () => {
    onChange([
      ...fields,
      {
        id: newFieldId(),
        label: `Question ${fields.length + 1}`,
        type: "text",
        required: false,
      },
    ]);
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) return;
    onChange(fields.filter((field) => field.id !== id));
  };

  const updateField = (id: string, patch: Partial<DraftField>) => {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Fields</h2>
        <button
          type="button"
          onClick={addField}
          className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-[10px] font-black tracking-[0.2em] text-black uppercase"
        >
          <Plus size={14} />
          Add field
        </button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="app-surface rounded-[32px] p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.3em] text-lime-400/70 uppercase">
              Field {index + 1}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveField(index, -1)}
                disabled={index === 0}
                className="text-white/30 hover:text-white disabled:opacity-30"
                aria-label="Move field up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => moveField(index, 1)}
                disabled={index === fields.length - 1}
                className="text-white/30 hover:text-white disabled:opacity-30"
                aria-label="Move field down"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="text-white/30 hover:text-red-400"
                aria-label="Remove field"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <input
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
            className="mb-4 w-full rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-sm text-white outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  updateField(field.id, {
                    type,
                    config: defaultConfig(type),
                  })
                }
                className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase ${
                  field.type === type ? "bg-lime-400 text-black" : "border border-white/10 text-white/45"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {field.type === "select" && (
            <textarea
              value={(field.config?.options ?? []).join("\n")}
              onChange={(e) =>
                updateField(field.id, {
                  config: {
                    ...field.config,
                    options: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  },
                })
              }
              rows={3}
              placeholder="One option per line"
              className="mt-4 w-full rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-sm text-white outline-none"
            />
          )}

          {field.type === "rating" && (
            <label className="mt-4 block text-xs text-white/50">
              Max rating
              <input
                type="number"
                min={1}
                max={10}
                value={field.config?.maxRating ?? 5}
                onChange={(e) =>
                  updateField(field.id, {
                    config: { ...field.config, maxRating: Number(e.target.value) || 5 },
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-sm text-white outline-none"
              />
            </label>
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
              className="accent-lime-400"
            />
            Required
          </label>
        </div>
      ))}
    </div>
  );
}
