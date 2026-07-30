import Link from "next/link";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/bits";
import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <Panel className="mx-auto max-w-xl">
      <EmptyState
        icon={<Keyboard className="size-5" aria-hidden />}
        title="That page does not exist"
        body="The link you followed leads nowhere in Klack. The typing test is where everything starts."
        action={
          <Button variant="primary" asChild>
            <Link href="/">Back to the test</Link>
          </Button>
        }
      />
    </Panel>
  );
}
