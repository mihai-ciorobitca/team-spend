import type { Metadata } from "next";
import { getChatGPTUser } from "./chatgpt-auth";
import { SpendingTracker } from "./spending-tracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TeamSpend — Team spending, sorted" },
  description: "Capture team expenses and receipt proof in seconds.",
};

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <SpendingTracker
      viewer={{
        name: user?.displayName ?? "Rog",
        email: user?.email ?? "owner@local.demo",
      }}
    />
  );
}
