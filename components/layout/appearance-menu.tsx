"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { updateSettings, useStore } from "@/lib/store";
import { ACCENTS, ACCENT_LABELS, type Accent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownContent,
  DropdownLabel,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownRoot,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function AppearanceMenu() {
  const { settings, ready } = useStore();
  const Icon = THEME_ICONS[settings.theme];

  return (
    <DropdownRoot>
      <Tooltip content="Appearance">
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Appearance settings">
            {ready ? <Icon className="size-4.5" aria-hidden /> : <Palette className="size-4.5" aria-hidden />}
          </Button>
        </DropdownTrigger>
      </Tooltip>

      <DropdownContent>
        <DropdownLabel>Theme</DropdownLabel>
        <DropdownRadioGroup
          value={settings.theme}
          onValueChange={(value) =>
            updateSettings({ theme: value as "system" | "light" | "dark" })
          }
        >
          <DropdownRadioItem value="light">
            <Sun className="size-4 text-ink-faint" aria-hidden />
            Light
          </DropdownRadioItem>
          <DropdownRadioItem value="dark">
            <Moon className="size-4 text-ink-faint" aria-hidden />
            Dark
          </DropdownRadioItem>
          <DropdownRadioItem value="system">
            <Monitor className="size-4 text-ink-faint" aria-hidden />
            Match system
          </DropdownRadioItem>
        </DropdownRadioGroup>

        <DropdownSeparator />

        <DropdownLabel>Accent</DropdownLabel>
        <DropdownRadioGroup
          value={settings.accent}
          onValueChange={(value) => updateSettings({ accent: value as Accent })}
        >
          {ACCENTS.map((accent) => (
            <DropdownRadioItem key={accent} value={accent}>
              <span
                aria-hidden
                data-swatch={accent}
                className="size-3.5 rounded-full border border-line"
              />
              {ACCENT_LABELS[accent]}
            </DropdownRadioItem>
          ))}
        </DropdownRadioGroup>
      </DropdownContent>
    </DropdownRoot>
  );
}
