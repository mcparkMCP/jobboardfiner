import type { JobBoard } from "./types";
import rawData from "@/data/jobboards.json";

export const jobBoards: JobBoard[] = (rawData as JobBoard[]).filter(
  (j) => !j._scrapeError
);

export const countries = [
  ...new Set(jobBoards.map((j) => j.country).filter(Boolean)),
].sort();

export const types = [
  ...new Set(jobBoards.map((j) => j.type).filter(Boolean)),
].sort();

export const scopes = [
  ...new Set(jobBoards.map((j) => j.scope).filter(Boolean)),
].sort();

export function getBoard(slug: string): JobBoard | undefined {
  return jobBoards.find((j) => j.slug === slug);
}

export function searchBoards(params: {
  query?: string;
  country?: string;
  type?: string;
  scope?: string;
  sort?: string;
}): JobBoard[] {
  let results = [...jobBoards];

  if (params.query) {
    const q = params.query.toLowerCase();
    results = results.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        j.country?.toLowerCase().includes(q) ||
        j.specialties?.some((s) => s.toLowerCase().includes(q)) ||
        j.languages?.some((l) => l.toLowerCase().includes(q))
    );
  }

  if (params.country) {
    results = results.filter((j) => j.country === params.country);
  }

  if (params.type) {
    results = results.filter((j) => j.type === params.type);
  }

  if (params.scope) {
    results = results.filter((j) => j.scope === params.scope);
  }

  switch (params.sort) {
    case "name":
      results.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "score-desc":
      results.sort(
        (a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0")
      );
      break;
    case "score-asc":
      results.sort(
        (a, b) => parseFloat(a.score || "0") - parseFloat(b.score || "0")
      );
      break;
    case "reviews":
      results.sort((a, b) => (b.reviews?.length || 0) - (a.reviews?.length || 0));
      break;
    case "newest":
      results.sort(
        (a, b) =>
          parseInt(b.yearFounded || "0") - parseInt(a.yearFounded || "0")
      );
      break;
    default:
      results.sort(
        (a, b) => parseFloat(b.score || "0") - parseFloat(a.score || "0")
      );
  }

  return results;
}
