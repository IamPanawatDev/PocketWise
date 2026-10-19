import type { Metadata } from "next";
import { TransactionList } from "@/features/transactions/components/TransactionList";

export const metadata: Metadata = { title: "รายการ — PocketWise" };

export default function TransactionsPage() {
  return <TransactionList />;
}
