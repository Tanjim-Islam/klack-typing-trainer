"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  DRILL_NAME_MAX,
  DRILL_TEXT_MAX,
  drillFormSchema,
  type Drill,
  type DrillFormValues,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogRoot } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";

type Errors = Partial<Record<keyof DrillFormValues, string>>;

const BLANK: DrillFormValues = { name: "", description: "", text: "" };

export function DrillFormDialog({
  open,
  onOpenChange,
  drill,
  existingNames,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when creating. */
  drill?: Drill;
  /** Names already taken, so the drill list stays unambiguous. */
  existingNames: string[];
  onSubmit: (values: DrillFormValues) => void;
}) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={drill ? "Edit drill" : "New drill"}
        description={
          drill
            ? "Changes apply the next time you practise this drill."
            : "Write or paste the text you want to practise. Anything you type often works well: code you fumble, product names, or punctuation that trips you up."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="drill-form">
              <Save className="size-4" aria-hidden />
              {drill ? "Save changes" : "Create drill"}
            </Button>
          </>
        }
      >
        {/* Keyed so each open mounts a fresh form: a cancelled edit can never
            leak into the next one. */}
        <DrillForm
          key={drill?.id ?? "new"}
          initial={
            drill
              ? { name: drill.name, description: drill.description, text: drill.text }
              : BLANK
          }
          existingNames={existingNames}
          onValid={(values) => {
            onSubmit(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </DialogRoot>
  );
}

function DrillForm({
  initial,
  existingNames,
  onValid,
}: {
  initial: DrillFormValues;
  existingNames: string[];
  onValid: (values: DrillFormValues) => void;
}) {
  const [values, setValues] = useState<DrillFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof DrillFormValues>(key: K, value: DrillFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Guard against a double submit from a fast second Enter press.
    if (submitting) return;

    const parsed = drillFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof DrillFormValues;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    if (
      existingNames.some(
        (name) => name.toLowerCase() === parsed.data.name.toLowerCase(),
      )
    ) {
      setErrors({ name: "You already have a drill with this name." });
      return;
    }

    setSubmitting(true);
    onValid(parsed.data);
  };

  const textLength = (values.text ?? "").trim().length;

  return (
    <form id="drill-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        label="Name"
        required
        error={errors.name}
        counter={`${(values.name ?? "").length}/${DRILL_NAME_MAX}`}
      >
        {(props) => (
          <Input
            {...props}
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            maxLength={DRILL_NAME_MAX}
            placeholder="Bracket pairs"
            autoFocus
          />
        )}
      </Field>

      <Field
        label="Note"
        hint="Optional. A reminder of what this drill is for."
        error={errors.description}
      >
        {(props) => (
          <Input
            {...props}
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={160}
            placeholder="Curly braces and arrow functions"
          />
        )}
      </Field>

      <Field
        label="Practice text"
        required
        error={errors.text}
        hint="Line breaks are folded into spaces when you practise."
        counter={`${textLength}/${DRILL_TEXT_MAX}`}
      >
        {(props) => (
          <Textarea
            {...props}
            value={values.text}
            onChange={(event) => set("text", event.target.value)}
            maxLength={DRILL_TEXT_MAX}
            rows={7}
            placeholder="const handler = (event) => { event.preventDefault(); };"
          />
        )}
      </Field>
    </form>
  );
}
