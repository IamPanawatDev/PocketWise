import type { Metadata } from "next";
import { BankAccountsView } from "@/features/accounts/components/BankAccountsView";

export const metadata: Metadata = { title: "บัญชี — PocketWise" };

export default function BankAccountsPage() {
  return <BankAccountsView />;
}
