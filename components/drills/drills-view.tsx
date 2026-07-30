"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Copy,
  Dumbbell,
  Lock,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { formatInt, formatRelative } from "@/lib/format";
import {
  createDrill,
  deleteDrill,
  duplicateDrill,
  editDrill,
  queueDrill,
  useStore,
} from "@/lib/store";
import type { Drill, DrillFormValues } from "@/lib/types";
import { Badge, EmptyState, Skeleton } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { DrillFormDialog } from "./drill-form-dialog";

function DrillCard({
  drill,
  onPractise,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  drill: Drill;
  onPractise: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const words = drill.text.trim().split(/\s+/).length;

  return (
    <Panel className="flex flex-col">
      <div className="flex-1 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-semibold leading-snug text-ink">
            {drill.name}
          </h3>
          {drill.builtIn ? (
            <Tooltip content="Built in. Duplicate it to make an editable copy.">
              <Badge tone="neutral" className="shrink-0">
                <Lock className="size-3" aria-hidden />
                Built in
              </Badge>
            </Tooltip>
          ) : null}
        </div>

        {drill.description ? (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {drill.description}
          </p>
        ) : null}

        <p className="mt-3 line-clamp-2 rounded-md bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed text-ink-soft">
          {drill.text}
        </p>

        <p className="legend mt-3">
          {formatInt(words)} words - {formatInt(drill.text.length)} characters
          {drill.builtIn ? "" : ` - edited ${formatRelative(drill.updatedAt)}`}
        </p>
      </div>

      <div className="flex items-center gap-1 border-t border-line bg-muted/30 px-3 py-2.5">
        <Button variant="primary" size="sm" onClick={onPractise}>
          <Play className="size-3.5" aria-hidden />
          Practise
        </Button>

        <Tooltip content="Duplicate">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onDuplicate}
            aria-label={`Duplicate ${drill.name}`}
            className="ml-auto"
          >
            <Copy className="size-4" aria-hidden />
          </Button>
        </Tooltip>

        {drill.builtIn ? null : (
          <>
            <Tooltip content="Edit">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onEdit}
                aria-label={`Edit ${drill.name}`}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button
                variant="dangerGhost"
                size="iconSm"
                onClick={onDelete}
                aria-label={`Delete ${drill.name}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </Tooltip>
          </>
        )}
      </div>
    </Panel>
  );
}

export function DrillsView() {
  const router = useRouter();
  const toast = useToast();
  const { ready, drills } = useStore();

  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Drill | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Drill | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return drills;
    return drills.filter(
      (d) =>
        d.name.toLowerCase().includes(needle) ||
        d.description.toLowerCase().includes(needle) ||
        d.text.toLowerCase().includes(needle),
    );
  }, [drills, query]);

  const custom = filtered.filter((d) => !d.builtIn);
  const builtIn = filtered.filter((d) => d.builtIn);

  const practise = (drill: Drill) => {
    queueDrill({ name: drill.name, text: drill.text });
    router.push("/");
  };

  const handleSubmit = (values: DrillFormValues) => {
    if (editing) {
      editDrill(editing.id, values);
      toast({ tone: "success", message: "Drill updated", detail: values.name });
    } else {
      const created = createDrill(values);
      if (created) {
        toast({ tone: "success", message: "Drill created", detail: created.name });
      } else {
        toast({ tone: "error", message: "Could not save that drill" });
      }
    }
    setEditing(undefined);
  };

  if (!ready) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56" />
        ))}
        <span className="sr-only">Loading your drills</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader
          icon={<Dumbbell className="size-4" aria-hidden />}
          title="Your drills"
          description="Saved text you can practise on demand. Seven are built in; add your own for anything you type often."
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New drill
            </Button>
          }
        />
        <PanelBody className="py-3.5">
          <div className="relative sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drills"
              aria-label="Search drills"
              className="pl-9"
            />
          </div>
        </PanelBody>
      </Panel>

      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Search className="size-5" aria-hidden />}
            title="No drills match"
            body={`Nothing found for "${query.trim()}". Try a different word, or create a drill with this text.`}
            action={
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          {custom.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="legend px-1">Yours ({custom.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {custom.map((drill) => (
                  <DrillCard
                    key={drill.id}
                    drill={drill}
                    onPractise={() => practise(drill)}
                    onEdit={() => {
                      setEditing(drill);
                      setFormOpen(true);
                    }}
                    onDuplicate={() => {
                      const copy = duplicateDrill(drill.id);
                      if (copy) {
                        toast({
                          tone: "success",
                          message: "Copy created",
                          detail: copy.name,
                        });
                      }
                    }}
                    onDelete={() => setPendingDelete(drill)}
                  />
                ))}
              </div>
            </section>
          ) : query.trim() === "" ? (
            <Panel>
              <EmptyState
                icon={<Plus className="size-5" aria-hidden />}
                title="No drills of your own yet"
                body="Add text you actually type: a code pattern you fumble, product names, or the punctuation that trips you up."
                action={
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditing(undefined);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Create your first drill
                  </Button>
                }
              />
            </Panel>
          ) : null}

          {builtIn.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="legend px-1">Built in ({builtIn.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {builtIn.map((drill) => (
                  <DrillCard
                    key={drill.id}
                    drill={drill}
                    onPractise={() => practise(drill)}
                    onEdit={() => undefined}
                    onDuplicate={() => {
                      const copy = duplicateDrill(drill.id);
                      if (copy) {
                        toast({
                          tone: "success",
                          message: "Editable copy created",
                          detail: copy.name,
                        });
                      }
                    }}
                    onDelete={() => undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <DrillFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        drill={editing}
        existingNames={drills
          .filter((d) => d.id !== editing?.id)
          .map((d) => d.name)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this drill?"
        body={
          pendingDelete ? (
            <>
              <strong className="font-semibold text-ink">{pendingDelete.name}</strong>{" "}
              will be removed. Test results from practising it stay in your history.
              This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete drill"
        onConfirm={() => {
          if (pendingDelete) {
            deleteDrill(pendingDelete.id);
            toast({ tone: "success", message: "Drill deleted", detail: pendingDelete.name });
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
