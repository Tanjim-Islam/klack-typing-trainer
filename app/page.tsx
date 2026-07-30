import { QuickStats } from "@/components/type/quick-stats";
import { TypingTest } from "@/components/type/typing-test";

export default function TypePage() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-end lg:gap-10">
        <div>
          <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            Type faster by fixing the keys you keep missing.
          </h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
            Klack scores every keystroke, shows which keys cost you the most, and
            turns them into a practice drill. Pick a test below and start typing.
          </p>
        </div>
        <div className="lg:justify-self-end">
          <QuickStats />
        </div>
      </header>

      <TypingTest />
    </div>
  );
}
