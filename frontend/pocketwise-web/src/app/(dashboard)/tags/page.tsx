import type { Metadata } from "next";
import { TagsView } from "@/features/tags/components/TagsView";

export const metadata: Metadata = { title: "แท็ก — PocketWise" };

export default function TagsPage() {
  return <TagsView />;
}
