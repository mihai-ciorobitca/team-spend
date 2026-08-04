import type { Metadata } from "next";
import { SpendingTracker } from "./spending-tracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Peptiking — Team spending, sorted" },
  description: "Capture team expenses and receipt proof in seconds.",
};

export default function Home() {
  return <SpendingTracker />;
}
