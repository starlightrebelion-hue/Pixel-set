import type { GenreId } from "@/game/genre-sets";

const SCENE_SLUGS: Record<string, string> = {
  "La traición": "la-traicion",
  "El reencuentro": "el-reencuentro",
  "La carta": "la-carta",
  "Bajo la lluvia": "bajo-la-lluvia",
  "El silencio": "el-silencio",
  "Última toma": "ultima-toma",
};

const GENRE_SLUGS: Record<GenreId, string> = {
  drama: "drama",
  comedy: "comedia",
  romance: "romance",
  noir: "noir",
  horror: "terror",
  "science-fiction": "ciencia-ficcion",
  fantasy: "fantasia",
  western: "western",
  adventure: "aventura",
};

/** Ordered fallback: exact scene art first, then genre art, then the legacy stage. */
export function getDioramaBackgrounds(scene: string, genre: GenreId): string[] {
  const sceneSlug = SCENE_SLUGS[scene];
  const genreSlug = GENRE_SLUGS[genre];
  const paths = [
    ...(sceneSlug ? [`/set/diorama/scenes/${sceneSlug}.jpg`, `/set/diorama/scenes/${sceneSlug}.png`] : []),
    `/set/diorama/genres/${genreSlug}.jpg`,
    `/set/diorama/genres/${genreSlug}.png`,
    "/set/stage.jpg",
  ];
  return [...new Set(paths)];
}

/** Optional transparent foreground plane: furniture edges, plants and practical props. */
export function getDioramaForegrounds(scene: string, genre: GenreId): string[] {
  const sceneSlug = SCENE_SLUGS[scene];
  const genreSlug = GENRE_SLUGS[genre];
  return [
    ...(sceneSlug ? [`/set/diorama/foreground/${sceneSlug}.png`] : []),
    `/set/diorama/foreground/${genreSlug}.png`,
  ];
}

/** Subtle photographic finish; artwork itself supplies the diorama depth and materials. */
export function drawDioramaAtmosphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  const vignette = ctx.createRadialGradient(
    x + width * 0.5, y + height * 0.46, width * 0.12,
    x + width * 0.5, y + height * 0.5, width * 0.72,
  );
  vignette.addColorStop(0, "rgba(20, 15, 12, 0)");
  vignette.addColorStop(1, "rgba(20, 15, 12, 0.24)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}
