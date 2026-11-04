import { DEFAULT_STORY, type StoryDefinition, type StoryChapter } from "@/game/stories";
import {
  ANGRY_REPLIES,
  BOUNDS,
  CHATS,
  COMPLAINTS,
  CREW,
  FIXED_REPLIES,
  ISSUES,
  SCENES,
  type CrewId,
  type Mood,
} from "@/game/crew";

export type BubbleKind = "dir" | "angry" | "ok";

export type Bubble = {
  text: string;
  life: number;
  kind: BubbleKind;
};

export type Person = {
  id: CrewId;
  name: string;
  role: string;
  job: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  homeX: number;
  homeY: number;
  facing: 1 | -1;
  state: Mood;
  stateTimer: number;
  decision: number;
  boredom: number;
  cooldown: number;
  napping: boolean;
  partner: CrewId | null;
  bubble: Bubble | null;
  ring: number;
  dragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  dragStartedAway: boolean;
  dragActivated: boolean;
};

export type Particle = {
  kind: "z" | "steam" | "confetti";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  char: string;
};

export type LogLine = {
  id: number;
  who: string;
  text: string;
  kind: BubbleKind;
};

export type HudPerson = {
  id: CrewId;
  name: string;
  role: string;
  state: Mood;
  moving: boolean;
};

export type Hud = {
  take: number;
  scene: string;
  stress: number;
  quality: number;
  mood: string;
  paused: boolean;
  timeLeft: number;
  objective: string;
  stationCount: number;
  coffeeCount: number;
  manualRescues: number;
  rescueGoal: number;
  storyTitle: string;
  storyPremise: string;
  chapterTitle: string;
  chapterBriefing: string;
  chapterIndex: number;
  chapterCount: number;
  qualityTarget: number;
  stressLimit: number;
  lives: number;
  campaignComplete: boolean;
  gameOver: boolean;
  chapterFailed: boolean;
  people: HudPerson[];
};

type Chat = {
  a: CrewId;
  b: CrewId;
  line: string;
  reply: string;
  said: boolean;
  age: number;
};

export const COFFEE_SPOT: [number, number] = [0.86, 0.52];
const SPEED = 0.16;
const BUBBLE_LIFE = 3.4;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function clampPoint(x: number, y: number): [number, number] {
  return [clamp(x, BOUNDS.minX, BOUNDS.maxX), clamp(y, BOUNDS.minY, BOUNDS.maxY)];
}

export function createSim(onLog: (line: LogLine) => void) {
  let logId = 1;
  let take = 1;
  let sceneIndex = 0;
  let stress = 12;
  let quality = 8;
  let paused = false;
  let shake = 0;
  let time = 0;
  let timeLeft = 90;
  let chatCooldown = 10.5;
  let manualRescues = 0;
  let activeStory: StoryDefinition = DEFAULT_STORY;
  let chapterIndex = 0;
  let lives = 3;
  let campaignComplete = false;
  let gameOver = false;
  let chapterFailed = false;
  let pending: Chat | null = null;
  const particles: Particle[] = [];

  const people: Person[] = CREW.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    job: c.job,
    x: c.homeX,
    y: c.homeY,
    tx: c.homeX,
    ty: c.homeY,
    homeX: c.homeX,
    homeY: c.homeY,
    facing: 1,
    state: "work" as Mood,
    stateTimer: 0,
    decision: 10 + Math.random() * 6,
    boredom: 0,
    cooldown: 4,
    napping: false,
    partner: null,
    bubble: null,
    ring: 0,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    dragStartedAway: false,
    dragActivated: false,
  }));

  const byId = (id: CrewId) => people.find((p) => p.id === id)!;

  function burst(kind: Particle["kind"], x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      particles.push({
        kind,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.08,
        vy: kind === "confetti" ? -0.05 - Math.random() * 0.08 : -0.03 - Math.random() * 0.04,
        life: 0.8 + Math.random() * 0.8,
        max: 1.4,
        char: kind === "z" ? pick(["z", "z", "Z"]) : "",
      });
    }
    if (particles.length > 90) particles.splice(0, particles.length - 90);
  }

  function say(p: Person, text: string, kind: BubbleKind) {
    const active = people.filter((q) => q.bubble);
    if (active.length >= 2) {
      active.sort((a, b) => (a.bubble?.life ?? 0) - (b.bubble?.life ?? 0));
      active[0]!.bubble = null;
    }
    p.bubble = { text, life: BUBBLE_LIFE, kind };
    onLog({ id: logId++, who: p.name, text, kind });
    if (kind === "angry") shake = Math.max(shake, 0.7);
    if (kind === "dir") shake = Math.max(shake, 0.45);
  }

  function cancelChat() {
    if (!pending) return;
    const a = byId(pending.a);
    const b = byId(pending.b);
    if (a.partner === b.id) a.partner = null;
    if (b.partner === a.id) b.partner = null;
    if (a.state === "work" && !a.dragging) {
      a.tx = a.homeX;
      a.ty = a.homeY;
    }
    if (b.state === "work" && !b.dragging) {
      b.tx = b.homeX;
      b.ty = b.homeY;
    }
    pending = null;
  }

  function release(p: Person) {
    p.state = "work";
    p.partner = null;
    p.napping = false;
    p.dragging = false;
    p.dragStartedAway = false;
    p.boredom = 0;
    p.tx = p.homeX;
    p.ty = p.homeY;
    p.decision = 9 + Math.random() * 6;
  }

  function scold(target: Person, reason: "sleep" | "work") {
    if (target.id === "director") return;
    const director = byId("director");
    if (pending && (pending.a === target.id || pending.b === target.id)) cancelChat();
    target.napping = false;
    target.state = "angry";
    target.stateTimer = 2.8;
    target.partner = "director";
    target.boredom = 0;
    target.cooldown = 14;
    target.facing = director.x < target.x ? -1 : 1;
    director.state = "angry";
    director.stateTimer = 1.5;
    director.partner = target.id;
    director.facing = target.x < director.x ? -1 : 1;
    stress = clamp(stress + (reason === "sleep" ? 10 : 16), 0, 100);
    shake = Math.max(shake, 0.9);
    if (reason === "sleep") {
      say(director, `¡${target.name}! Esto no es una siesta. A trabajar.`, "dir");
      say(target, pick(["¡Ya voy!", "Perdón. Me quedé.", "Está bien, ya estoy."]), "angry");
    } else {
      say(director, `¡${target.name}! ${COMPLAINTS[target.id]}`, "dir");
      say(target, pick(ANGRY_REPLIES), "angry");
    }
  }

  function tryChat(): boolean {
    const pool = people.filter((p) => p.state === "work" && !p.partner && !p.dragging && p.boredom > 6 && dist(p.x, p.y, p.homeX, p.homeY) < 0.06);
    if (pool.length < 2) return false;
    const options = CHATS.filter((c) => {
      const a = byId(c.a);
      const b = byId(c.b);
      return a.state === "work" && b.state === "work" && !a.partner && !b.partner && !a.dragging && !b.dragging && a.boredom > 6 && b.boredom > 6 && dist(a.x, a.y, a.homeX, a.homeY) < 0.06 && dist(b.x, b.y, b.homeX, b.homeY) < 0.06;
    });
    if (!options.length) return false;
    const chat = pick(options);
    const a = byId(chat.a);
    const b = byId(chat.b);
    const mx = clamp((a.x + b.x) / 2, BOUNDS.minX, BOUNDS.maxX);
    const my = clamp((a.y + b.y) / 2, BOUNDS.minY, BOUNDS.maxY);
    a.tx = clamp(mx - 0.035, BOUNDS.minX, BOUNDS.maxX);
    a.ty = my;
    b.tx = clamp(mx + 0.035, BOUNDS.minX, BOUNDS.maxX);
    b.ty = my;
    a.partner = b.id;
    b.partner = a.id;
    pending = { a: a.id, b: b.id, line: chat.line, reply: chat.reply, said: false, age: 0 };
    return true;
  }

  function currentChapter(): StoryChapter {
    return activeStory.chapters[chapterIndex] ?? activeStory.chapters[activeStory.chapters.length - 1] ?? DEFAULT_STORY.chapters[0]!;
  }

  function resetChapterState() {
    const chapter = currentChapter();
    paused = false;
    timeLeft = chapter.timeLimit;
    quality = 0;
    stress = 12;
    manualRescues = 0;
    chapterFailed = false;
    chatCooldown = 8;
    cancelChat();
    particles.length = 0;
    for (const p of people) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.tx = p.homeX;
      p.ty = p.homeY;
      p.facing = 1;
      p.state = "work";
      p.stateTimer = 0;
      p.decision = 8 + Math.random() * 5;
      p.boredom = 0;
      p.cooldown = 3;
      p.napping = false;
      p.partner = null;
      p.bubble = null;
      p.ring = 0;
      p.dragging = false;
      p.dragOffsetX = 0;
      p.dragOffsetY = 0;
      p.dragStartedAway = false;
      p.dragActivated = false;
    }
  }

  function startNewGame(story: StoryDefinition = DEFAULT_STORY) {
    activeStory = story.chapters?.length ? story : DEFAULT_STORY;
    chapterIndex = 0;
    take = 1;
    sceneIndex = 0;
    lives = 3;
    campaignComplete = false;
    gameOver = false;
    chapterFailed = false;
    resetChapterState();
    say(byId("director"), `Comienza "${activeStory.title}". ${currentChapter().briefing}`, "dir");
    say(byId("produccion"), "Tenemos tres intentos para terminar esta historia. ¡A trabajar!", "ok");
  }

  function retryChapter() {
    if (campaignComplete || lives <= 0) return;
    resetChapterState();
    say(byId("director"), `Repetimos: ${currentChapter().title}. Esta vez lo sacamos.`, "dir");
  }

  function finishTake(ok: boolean) {
    const director = byId("director");
    const producer = byId("produccion");
    const chapter = currentChapter();
    if (ok) {
      say(director, "¡Corte! Objetivo cumplido. Impriman.", "dir");
      say(producer, `Capítulo ${chapterIndex + 1} terminado: ${chapter.title}.`, "ok");
      burst("confetti", 0.5, 0.7, 18);
      take += 1;
      stress = clamp(stress - 18, 0, 100);
      shake = Math.max(shake, 0.6);
      chapterFailed = false;
      if (chapterIndex + 1 >= activeStory.chapters.length) {
        campaignComplete = true;
        paused = true;
        say(director, `¡Fin de "${activeStory.title}"! El equipo terminó la película.`, "dir");
        return;
      }
      chapterIndex += 1;
      sceneIndex = (sceneIndex + 1) % SCENES.length;
      resetChapterState();
      say(director, `Siguiente capítulo: ${currentChapter().title}. ${currentChapter().briefing}`, "dir");
    } else {
      lives = Math.max(0, lives - 1);
      chapterFailed = true;
      paused = true;
      shake = 1.2;
      if (lives <= 0) {
        gameOver = true;
        say(director, "Se terminó la jornada. Nos quedamos sin intentos.", "angry");
        say(producer, "La película no llegó a completarse. Podés empezar otra historia.", "angry");
      } else {
        say(director, "¡Corten! No llegamos al objetivo. Revisá el equipo y reintentá el capítulo.", "dir");
        say(producer, `Quedan ${lives} intentos. No perdamos la película.`, "angry");
      }
    }
  }

  function moodText() {
    if (campaignComplete) return "¡Historia terminada!";
    if (gameOver) return "Fin de la jornada. Podés comenzar otra historia.";
    if (chapterFailed) return "Objetivo fallido. Reintentá el capítulo.";
    if (paused) return "Pausa. El set respira.";
    if (stress > 78) return "El set está al límite.";
    if (people.some((p) => p.state === "sleep")) return "Alguien se está durmiendo en el set.";
    if (people.some((p) => p.state === "angry")) return "Tensión entre departamentos.";
    if (people.some((p) => p.state === "coffee")) return "Hay una pausa de café. Recuperá el ritmo del set.";
    if (people.some((p) => p.state === "talk")) return "Hay una charla entre departamentos. Reorganizá al equipo.";
    if (quality > 82) return "Esta toma está por cerrar.";
    return "Rodando. Los departamentos trabajan.";
  }

  function step(dt: number) {
    // A real cut/pause freezes timers, crew decisions, movement and particles.
    if (paused) return;
    time += dt;
    shake = Math.max(0, shake - dt * 1.4);
    chatCooldown -= dt;

    for (const p of people) {
      if (p.bubble) {
        p.bubble.life -= dt;
        if (p.bubble.life <= 0) p.bubble = null;
      }
      p.ring = Math.max(0, p.ring - dt);
      p.cooldown = Math.max(0, p.cooldown - dt);

      if (!p.dragging && p.state === "coffee") {
        // Coffee time starts only after the person reaches the coffee corner.
        if (dist(p.x, p.y, p.tx, p.ty) < 0.05) {
          p.stateTimer -= dt;
          if (p.stateTimer <= 0) {
            say(p, "Listo, café terminado. Vuelvo a mi puesto.", "ok");
            release(p);
            p.cooldown = 3.5;
          }
        }
      } else if (!p.dragging && (p.state === "angry" || p.state === "talk" || p.state === "sleep")) {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          if (p.state === "angry" && p.id !== "director") {
            say(p, pick(FIXED_REPLIES), "ok");
            stress = clamp(stress - 6, 0, 100);
          }
          if (p.state === "sleep") {
            say(p, "Uy. Me quedé. Sigo.", "ok");
            p.cooldown = 10;
          }
          release(p);
        }
      } else if (!paused && p.state === "work" && !p.dragging) {
        p.decision -= dt;
        const atStation = dist(p.x, p.y, p.homeX, p.homeY) < 0.05;
        if (atStation) p.boredom += dt;
        else p.boredom = Math.max(0, p.boredom - dt * 0.8);

        if (p.id !== "director" && atStation && p.cooldown <= 0 && !p.partner && p.decision <= 0) {
          p.state = "coffee";
          p.stateTimer = 5.5 + Math.random() * 3;
          p.napping = false;
          p.boredom = 0;
          p.tx = clamp(COFFEE_SPOT[0] + (Math.random() - 0.5) * 0.035, BOUNDS.minX, BOUNDS.maxX);
          p.ty = clamp(COFFEE_SPOT[1] + (Math.random() - 0.5) * 0.025, BOUNDS.minY, BOUNDS.maxY);
          p.decision = 9 + Math.random() * 6;
          say(p, pick(["Me voy por un café. Enseguida vuelvo.", "Necesito despejarme un minuto.", "Una pausa y sigo con la toma."]), "ok");
        }
      }

      if (p.state === "sleep" && Math.random() < dt * 1.6) burst("z", p.x, p.y - 0.1, 1);
      if (p.state === "angry" && Math.random() < dt * 2.2) burst("steam", p.x, p.y - 0.12, 1);

      const canMove = p.state === "work" || p.state === "coffee";
      if (canMove && !p.dragging) {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.008) {
          const stepDist = Math.min(d, SPEED * dt);
          p.x += (dx / d) * stepDist;
          p.y += (dy / d) * stepDist;
          if (dx < -0.004) p.facing = -1;
          else if (dx > 0.004) p.facing = 1;
        }
      }
    }

    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const a = people[i]!;
        const b = people[j]!;
        if (a.dragging || b.dragging) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d < 0.04) {
          const push = ((0.04 - d) / d) * 0.35;
          a.x += dx * push;
          a.y += dy * push;
          b.x -= dx * push;
          b.y -= dy * push;
        }
      }
    }
    for (const p of people) {
      const [x, y] = clampPoint(p.x, p.y);
      p.x = x;
      p.y = y;
    }

    if (!paused) {
      timeLeft = Math.max(0, timeLeft - dt);
      const director = byId("director");
      const sleeper = people.find((p) => p.state === "sleep" && p.napping);
      if (sleeper && director.state === "work") {
        if (pending && (pending.a === "director" || pending.b === "director" || pending.a === sleeper.id || pending.b === sleeper.id)) {
          cancelChat();
        }
        director.partner = null;
        director.tx = sleeper.x;
        director.ty = clamp(sleeper.y - 0.03, BOUNDS.minY, BOUNDS.maxY);
        if (dist(director.x, director.y, sleeper.x, sleeper.y) < 0.08) scold(sleeper, "sleep");
      }

      if (pending) {
        pending.age += dt;
        const a = byId(pending.a);
        const b = byId(pending.b);
        const ready =
          dist(a.x, a.y, a.tx, a.ty) < 0.03 && dist(b.x, b.y, b.tx, b.ty) < 0.03;
        if (!pending.said && (ready || pending.age > 7)) {
          pending.said = true;
          a.state = "talk";
          b.state = "talk";
          a.stateTimer = 2.6;
          b.stateTimer = 2.6;
          a.tx = a.x;
          a.ty = a.y;
          b.tx = b.x;
          b.ty = b.y;
          say(a, pending.line, a.id === "director" ? "dir" : "ok");
          say(b, pending.reply, b.id === "director" ? "dir" : "ok");
          pending = null;
          chatCooldown = 11 + Math.random() * 4;
        }
      } else if (chatCooldown <= 0) {
        if (!tryChat()) chatCooldown = 1.6;
      }

      let working = 0;
      let sleeping = 0;
      let angry = 0;
      for (const p of people) {
        if (p.state === "sleep") sleeping += 1;
        else if (p.state === "angry") angry += 1;
        else if (p.state === "work" && !p.dragging && !p.partner && dist(p.x, p.y, p.homeX, p.homeY) < 0.05) working += 1;
      }
      quality = clamp(quality + (working * 0.18 - sleeping * 1.3 - angry * 0.55) * dt, 0, 100);
      stress = clamp(stress + (sleeping * 0.85 + angry * 0.35 - (sleeping + angry === 0 ? 0.22 : 0)) * dt, 0, 100);
      const chapter = currentChapter();
      const objectivesMet = quality >= chapter.qualityTarget && manualRescues >= chapter.rescueGoal && stress <= chapter.stressLimit;
      if (objectivesMet) finishTake(true);
      else if (stress >= 100 || timeLeft <= 0) finishTake(false);
    }

    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i]!.life <= 0) particles.splice(i, 1);
    }
  }

  function accion() {
    paused = false;
    stress = clamp(stress - 10, 0, 100);
    cancelChat();
    const director = byId("director");
    say(director, "¡Acción! Todos a sus puestos.", "dir");
    for (const p of people) {
      p.boredom = 0;
      p.cooldown = Math.max(p.cooldown, 6);
      if (p.state !== "work" || dist(p.x, p.y, p.homeX, p.homeY) > 0.05) {
        release(p);
        say(p, "¡Voy a mi estación!", "ok");
      }
    }
  }

  function scoldRandom() {
    const pool = people.filter((p) => p.id !== "director");
    const sleepers = pool.filter((p) => p.state === "sleep");
    const target = pick(sleepers.length ? sleepers : pool);
    const director = byId("director");
    director.x = clamp(target.x - 0.06, BOUNDS.minX, BOUNDS.maxX);
    director.y = target.y;
    scold(target, target.state === "sleep" ? "sleep" : "work");
  }

  function chaos() {
    const pool = people.filter((p) => p.id !== "director");
    const target = pick(pool);
    if (pending && (pending.a === target.id || pending.b === target.id)) cancelChat();
    target.state = "angry";
    target.stateTimer = 3.1;
    target.napping = false;
    target.boredom = 0;
    target.partner = "director";
    stress = clamp(stress + 22, 0, 100);
    quality = clamp(quality - 8, 0, 100);
    shake = Math.max(shake, 1);
    say(target, ISSUES[target.id as Exclude<CrewId, "director">], "angry");
    say(byId("director"), `¡${target.name}, resolvé eso! No podemos seguir así.`, "dir");
  }

  function coordinate() {
    paused = false;
    stress = clamp(stress - 14, 0, 100);
    const target = people.find((p) => p.id !== "director" && (p.state === "sleep" || p.state === "angry" || p.state === "coffee" || p.state === "talk" || dist(p.x, p.y, p.homeX, p.homeY) > 0.08));
    if (target) {
      if (pending && (pending.a === target.id || pending.b === target.id)) cancelChat();
      release(target);
      target.cooldown = 12;
      target.boredom = 0;
      say(byId("director"), `Coordino con ${target.name}. Volvemos al plan.`, "dir");
      say(target, "Entendido. Retomo mi puesto.", "ok");
    } else {
      say(byId("director"), "Equipo alineado. Mantengan el ritmo y cuiden la toma.", "dir");
    }
  }

  function corten() {
    paused = true;
    cancelChat();
    stress = clamp(stress - 30, 0, 100);
    for (const p of people) {
      p.boredom = 0;
      p.napping = false;
      p.partner = null;
      if (p.state === "sleep" || p.state === "angry" || p.state === "talk" || p.state === "coffee") release(p);
      else {
        p.tx = p.homeX;
        p.ty = p.homeY;
      }
    }
    say(byId("director"), "¡Corten! Pausa de cinco minutos. Respiramos y volvemos.", "dir");
  }

  function grab(nx: number, ny: number): CrewId | null {
    let best: Person | null = null;
    let bestD = 0.085;
    for (const p of people) {
      const d = dist(nx, ny, p.x, p.y - 0.06);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    if (!best) return null;
    const wasAway = best.state !== "work" || best.partner !== null || dist(best.x, best.y, best.homeX, best.homeY) > 0.07;
    if (pending && (pending.a === best.id || pending.b === best.id)) cancelChat();
    if (best.partner) {
      const partner = byId(best.partner);
      if (partner.partner === best.id) {
        partner.partner = null;
        if (partner.state === "work") {
          partner.tx = partner.homeX;
          partner.ty = partner.homeY;
        }
      }
      best.partner = null;
    }
    best.dragStartedAway = wasAway;
    best.dragOffsetX = best.x - nx;
    best.dragOffsetY = best.y - ny;
    best.dragActivated = false;
    best.dragging = true;
    best.ring = 2.2;
    return best.id;
  }

  function drag(id: CrewId, nx: number, ny: number) {
    const p = byId(id);
    if (!p.dragging) return;
    if (!p.dragActivated) {
      p.dragActivated = true;
      if (pending && (pending.a === id || pending.b === id)) cancelChat();
      if (p.partner) {
        const partner = byId(p.partner);
        if (partner.partner === id) {
          partner.partner = null;
          if (partner.state === "work") {
            partner.tx = partner.homeX;
            partner.ty = partner.homeY;
          }
        }
        p.partner = null;
      }
    }
    const [x, y] = clampPoint(nx + p.dragOffsetX, ny + p.dragOffsetY);
    if (x < p.x - 0.002) p.facing = -1;
    else if (x > p.x + 0.002) p.facing = 1;
    p.x = x;
    p.y = y;
    p.tx = x;
    p.ty = y;
  }

  function cancelDrag(id: CrewId) {
    const p = byId(id);
    p.dragging = false;
    p.dragStartedAway = false;
    p.dragActivated = false;
  }

  function drop(id: CrewId, nx: number, ny: number) {
    const p = byId(id);
    if (!p.dragging) return;
    drag(id, nx, ny);
    p.dragging = false;
    const wasAway = p.dragStartedAway;
    p.dragStartedAway = false;
    p.dragActivated = false;
    if (pending && (pending.a === id || pending.b === id)) cancelChat();
    if (p.partner) {
      const partner = byId(p.partner);
      if (partner.partner === id) {
        partner.partner = null;
        if (partner.state === "work") {
          partner.tx = partner.homeX;
          partner.ty = partner.homeY;
        }
      }
    }
    p.partner = null;
    p.state = "work";
    p.stateTimer = 0;
    p.napping = false;
    p.boredom = 0;
    p.decision = 10 + Math.random() * 6;
    p.cooldown = Math.max(p.cooldown, 8);
    p.tx = p.homeX;
    p.ty = p.homeY;

    const atStation = dist(nx, ny, p.homeX, p.homeY) <= 0.12;
    if (atStation) {
      p.x = p.homeX;
      p.y = p.homeY;
      if (wasAway) {
        manualRescues = Math.min(currentChapter().rescueGoal, manualRescues + 1);
        quality = clamp(quality + 7, 0, 100);
        stress = clamp(stress - 4, 0, 100);
        say(p, "¡Bien! Recuperé mi puesto. A trabajar.", "ok");
        if (manualRescues === currentChapter().rescueGoal) {
          quality = clamp(quality + 10, 0, 100);
          stress = clamp(stress - 8, 0, 100);
          say(byId("director"), "¡Objetivo de equipo cumplido! Bonus de producción.", "dir");
        }
      } else {
        say(p, "Estoy en mi estación. ¿Qué sigue?", "ok");
      }
    } else {
      say(p, "¡Vuelvo a mi estación! El escritorio está marcado.", "ok");
    }
  }

  function focus(id: CrewId) {
    const p = byId(id);
    click(p.x, p.y - 0.06);
  }

  function click(nx: number, ny: number) {
    let best: Person | null = null;
    let bestD = 0.09;
    for (const p of people) {
      const d = dist(nx, ny, p.x, p.y - 0.06);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    if (!best) return;
    best.ring = 2.2;
    if (best.state === "sleep") say(best, "Shh… cinco minutos y vuelvo.", "ok");
    else if (best.state === "angry") say(best, "Ya lo estoy arreglando. No me apuren.", "angry");
    else if (best.state === "talk") say(best, "Estoy en esto con el equipo.", "ok");
    else if (best.state === "coffee") say(best, "Estoy tomando un café. Arrastrame a mi escritorio para volver.", "ok");
    else say(best, best.job, best.id === "director" ? "dir" : "ok");
  }

  function hud(): Hud {
    return {
      take,
      scene: SCENES[sceneIndex] ?? SCENES[0]!,
      stress: Math.round(stress),
      quality: Math.round(quality),
      mood: moodText(),
      paused,
      timeLeft: Math.ceil(timeLeft),
      objective: `Calidad ${Math.round(quality)}/${currentChapter().qualityTarget} · Recuperaciones ${manualRescues}/${currentChapter().rescueGoal} · Estrés máximo ${currentChapter().stressLimit}%`,
      stationCount: people.filter((p) => p.state === "work" && !p.partner && !p.dragging && dist(p.x, p.y, p.homeX, p.homeY) < 0.05).length,
      coffeeCount: people.filter((p) => p.state === "coffee" || p.state === "talk").length,
      manualRescues,
      rescueGoal: currentChapter().rescueGoal,
      storyTitle: activeStory.title,
      storyPremise: activeStory.premise,
      chapterTitle: currentChapter().title,
      chapterBriefing: currentChapter().briefing,
      chapterIndex: chapterIndex + 1,
      chapterCount: activeStory.chapters.length,
      qualityTarget: currentChapter().qualityTarget,
      stressLimit: currentChapter().stressLimit,
      lives,
      campaignComplete,
      gameOver,
      chapterFailed,
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        state: p.state,
        moving: (p.state === "work" || p.state === "coffee") && dist(p.x, p.y, p.tx, p.ty) > 0.02,
      })),
    };
  }

  return { people, particles, step, startNewGame, retryChapter, accion, coordinate, scold: scoldRandom, chaos, corten, click, grab, drag, drop, cancelDrag, focus, hud, get shake() { return shake; } };
}

export type Sim = ReturnType<typeof createSim>;
