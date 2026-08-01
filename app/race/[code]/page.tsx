import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RaceRoom } from "@/components/race/race-room";
import { displayRaceCode, normalizeRaceCode, raceCodeSchema } from "@/lib/race";

interface RaceRoomPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: RaceRoomPageProps): Promise<Metadata> {
  const code = normalizeRaceCode((await params).code);
  return {
    title: raceCodeSchema.safeParse(code).success
      ? `Room ${displayRaceCode(code)}`
      : "1v1 room",
    description: "A live, fair typing race with one shared text and one shared countdown.",
  };
}

export default async function RaceRoomPage({ params }: RaceRoomPageProps) {
  const code = normalizeRaceCode((await params).code);
  if (!raceCodeSchema.safeParse(code).success) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <RaceRoom code={code} />
    </div>
  );
}
