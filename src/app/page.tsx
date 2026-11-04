// ============================================================
// VibeFlow Studio — Landing / Redirect to Dashboard
// ============================================================

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
