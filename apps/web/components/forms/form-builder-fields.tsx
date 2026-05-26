"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "select"
  | "rating"
  | "date"
  | "checkbox";

export interface DraftField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  config?: {
    options?: string[];
    maxRating?: number;
    placeholder?: string;
    checkboxLabel?: string;
    showWhen?: {
      fieldId: string;
      operator: "eq" | "neq";
      value: string;
    };
  };
}

const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "email",
  "number",
  "select",
  "rating",
  "date",
  "checkbox",
];

function defaultConfig(type: FieldType): DraftField["config"] {
  if (type === "select") return { options: ["Option 1", "Option 2"] };
  if (type === "rating") return { maxRating: 5 };
  if (type === "checkbox") return { options: ["Option 1"] };
  return undefined;
}

function getCheckboxOptions(field: DraftField): string[] {
  const options = field.config?.options?.map((option) => option.trim()).filter(Boolean);
  if (options?.length) return options;
  if (field.config?.checkboxLabel?.trim()) return [field.config.checkboxLabel];
  return ["Option 1"];
}

function newFieldId() {
  return crypto.randomUUID();
}

const MAX_FIELDS = 50;

interface FormBuilderFieldsProps {
  fields: DraftField[];
  onChange: (fields: DraftField[]) => void;
}

export function FormBuilderFields({ fields, onChange }: FormBuilderFieldsProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addField = () => {
    if (fields.length >= MAX_FIELDS) {
      toast.error(`Maximum ${MAX_FIELDS} questions per form`);
      return;
    }
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

  const reorderField = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= fields.length || toIndex >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(fromIndex, 1);
    if (!item) return;
    next.splice(toIndex, 0, item);
    onChange(next);
  };

  const addFieldButtonClass =
    "inline-flex items-center gap-2 rounded-full bg-lime-400 px-4 py-2 text-[10px] font-black tracking-[0.2em] text-black uppercase transition-opacity hover:opacity-90";

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-2 flex items-center justify-between border-b border-white/8 bg-black/90 px-2 py-3 backdrop-blur-md">
        <h2 className="font-display text-xl font-bold text-white">Fields</h2>
        <button type="button" onClick={addField} className={addFieldButtonClass}>
          <Plus size={14} />
          Add field
        </button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragIndex === null) return;
            reorderField(dragIndex, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={`app-surface rounded-[32px] p-6 transition-opacity ${dragIndex === index ? "opacity-60" : ""}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.3em] text-lime-400/70 uppercase">
              Field {index + 1} · drag to reorder
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

          {(field.type === "text" ||
            field.type === "textarea" ||
            field.type === "email" ||
            field.type === "number" ||
            field.type === "date") && (
            <label className="mt-4 block text-xs text-white/50">
              Placeholder
              <input
                value={field.config?.placeholder ?? ""}
                onChange={(e) =>
                  updateField(field.id, {
                    config: { ...field.config, placeholder: e.target.value || undefined },
                  })
                }
                placeholder="Optional hint text"
                className="mt-2 w-full rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-sm text-white outline-none"
              />
            </label>
          )}

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

          {field.type === "checkbox" && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-white/50">Checkbox options</p>
              {getCheckboxOptions(field).map((option, optionIndex) => (
                <div key={`${field.id}-option-${optionIndex}`} className="flex items-center gap-2">
                  <input
                    value={option}
                    onChange={(e) => {
                      const nextOptions = getCheckboxOptions(field).map((item, index) =>
                        index === optionIndex ? e.target.value : item,
                      );
                      updateField(field.id, {
                        config: { options: nextOptions },
                      });
                    }}
                    placeholder={`Option ${optionIndex + 1}`}
                    className="flex-1 rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const currentOptions = getCheckboxOptions(field);
                      if (currentOptions.length <= 1) return;
                      updateField(field.id, {
                        config: {
                          options: currentOptions.filter((_, index) => index !== optionIndex),
                        },
                      });
                    }}
                    disabled={getCheckboxOptions(field).length <= 1}
                    className="text-white/30 hover:text-red-400 disabled:opacity-30"
                    aria-label="Remove checkbox option"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const currentOptions = getCheckboxOptions(field);
                  updateField(field.id, {
                    config: {
                      options: [...currentOptions, `Option ${currentOptions.length + 1}`],
                    },
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 px-4 py-2 text-[10px] font-black tracking-[0.2em] text-lime-400 uppercase transition-colors hover:border-lime-400/50 hover:bg-lime-400/5"
              >
                <Plus size={14} />
                Add option
              </button>
            </div>
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

          {index > 0 && (
            <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/2 p-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50">
                <input
                  type="checkbox"
                  checked={Boolean(field.config?.showWhen)}
                  onChange={(event) => {
                    if (!event.target.checked) {
                      const nextConfig = { ...field.config };
                      delete nextConfig.showWhen;
                      updateField(field.id, {
                        config: Object.keys(nextConfig).length > 0 ? nextConfig : defaultConfig(field.type),
                      });
                      return;
                    }
                    const priorField = fields[index - 1];
                    if (!priorField) return;
                    updateField(field.id, {
                      config: {
                        ...field.config,
                        showWhen: {
                          fieldId: priorField.id,
                          operator: "eq",
                          value: "",
                        },
                      },
                    });
                  }}
                  className="accent-lime-400"
                />
                Conditional — show when another answer matches
              </label>

              {field.config?.showWhen && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block text-[10px] text-white/40">
                    When field
                    <select
                      value={field.config.showWhen.fieldId}
                      onChange={(event) =>
                        updateField(field.id, {
                          config: {
                            ...field.config,
                            showWhen: {
                              ...field.config!.showWhen!,
                              fieldId: event.target.value,
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-white/5 bg-white/2 px-3 py-2 text-xs text-white outline-none"
                    >
                      {fields.slice(0, index).map((prior) => (
                        <option key={prior.id} value={prior.id}>
                          {prior.label || "Untitled"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[10px] text-white/40">
                    Operator
                    <select
                      value={field.config.showWhen.operator}
                      onChange={(event) =>
                        updateField(field.id, {
                          config: {
                            ...field.config,
                            showWhen: {
                              ...field.config!.showWhen!,
                              operator: event.target.value as "eq" | "neq",
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-white/5 bg-white/2 px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="eq">equals</option>
                      <option value="neq">not equals</option>
                    </select>
                  </label>
                  <label className="block text-[10px] text-white/40">
                    Value
                    <input
                      value={field.config.showWhen.value}
                      onChange={(event) =>
                        updateField(field.id, {
                          config: {
                            ...field.config,
                            showWhen: {
                              ...field.config!.showWhen!,
                              value: event.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Match value"
                      className="mt-1 w-full rounded-xl border border-white/5 bg-white/2 px-3 py-2 text-xs text-white outline-none"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="flex w-full items-center justify-center gap-2 rounded-[32px] border border-dashed border-lime-400/30 bg-lime-400/5 py-4 text-[10px] font-black tracking-[0.2em] text-lime-400 uppercase transition-colors hover:border-lime-400/50 hover:bg-lime-400/10"
      >
        <Plus size={14} />
        Add another field
      </button>
    </div>
  );
}