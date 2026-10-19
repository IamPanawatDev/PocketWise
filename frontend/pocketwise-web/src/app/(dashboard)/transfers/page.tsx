import type { Metadata } from "next";
import { TransfersView } from "@/features/transfers/components/TransfersView";

export const metadata: Metadata = { title: "โอนเงิน — PocketWise" };

export default function TransfersPage() {
  return <TransfersView />;
}
