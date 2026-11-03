import { createFileRoute } from "@tanstack/react-router";
import { FilmSet } from "@/components/film-set";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FilmSet />;
}
