"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PATHY_SECTIONS, type PathySection, type PersonaDto } from "@smartpathy/shared";
import { PersonaSection } from "./PersonaSection";

/** AC7.1: one section is editable at a time; the others stay read-only. */
export function PersonaEditor({
  persona: initialPersona,
  hasRequirements,
}: {
  persona: PersonaDto;
  hasRequirements: boolean;
}) {
  const router = useRouter();
  // Shows the saved values right away, without waiting for the server refresh.
  const [persona, setPersona] = useState(initialPersona);
  const [editing, setEditing] = useState<PathySection | null>(null);
  const [saved, setSaved] = useState<PathySection | null>(null);

  // AC7.5: the warning itself is rendered by the page, next to "Generate Requirements".
  const savedMessage = hasRequirements
    ? "Changes saved. The existing requirements were generated from the previous version of this persona; generate them again below."
    : "Changes saved.";

  return PATHY_SECTIONS.map(({ key, label }) => (
    <PersonaSection
      key={key}
      persona={persona}
      section={key}
      label={label}
      editing={editing === key}
      disabled={editing !== null && editing !== key}
      savedMessage={saved === key ? savedMessage : null}
      onEdit={() => {
        setSaved(null);
        setEditing(key);
      }}
      onCancel={() => setEditing(null)}
      onSaved={(updated) => {
        setPersona(updated);
        setEditing(null);
        setSaved(key);
        router.refresh(); // updates the outdated requirements warning (AC7.5)
      }}
    />
  ));
}
