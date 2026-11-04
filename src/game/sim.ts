import {
  ANGRY_REPLIES,
  BOUNDS,
  COMPLAINTS,
  CREW,
  DOOR,
  DOOR_IN,
  FIXED_REPLIES,
  ISSUES,
  MAP_LABEL,
  SCENES,
  STATIONS,
  type CrewId,
  type MapId,
  type Mood,
} from "@/game/crew";

export type BubbleKind = "dir" | "angry" | "ok";
export type Bubble = { text: string; life: number; kind: BubbleKind };
export type Person = {
  id: CrewId; name: string; role: string; job: string;
  x: number; y: number; tx: number; ty: number; homeX: number; homeY: number;
  facing: 1 | -1; state: Mood; stateTimer: number; decision: number; boredom: number;
  cooldown: number; napping: boolean; partner: CrewId | null; bubble: Bubble | null;
  ring: number; dragging: boolean; dragOffsetX: number; dragOffsetY: number;
  dragStartedAway: boolean; dragActivated: boolean; homeMap: MapId; carrying: boolean;
  visible: boolean;
};
export type Particle = { kind: "z" | "steam" | "confetti" | "tape"; x: number; y: number; vx: number; vy: number; life: number; max: number; char: string };
export type LogLine = { id: number; who: string; text: string; kind: BubbleKind };
export type HudPerson = { id: CrewId; name: string; role: string; state: Mood; moving: boolean };
export type Phase = "guion" | "prep" | "rolling" | "cut" | "carry" | "editing" | "idle";
export type Hud = {
  take: number; scene: string; stress: number; quality: number; mood: string; paused: boolean;
  timeLeft: number; objective: string; stationCount: number; coffeeCount: number;
  manualRescues: number; rescueGoal: number; people: HudPerson[]; phase: Phase; map: MapId; mapLabel: string;
  transitioning: boolean;
};
type Chat = { a: CrewId; b: CrewId; line: string; reply: string; said: boolean; age: number };

type Transition = {
  target: MapId;
  nextPhase: Phase;
  stage: "exit" | "enter";
  timer: number;
  afterEnter?: () => void;
};

export const COFFEE_SPOT: [number, number] = [0.72, 0.52];
const RESCUE_GOAL = 3;
const SPEED = 0.16;
const BUBBLE_LIFE = 3.4;
const EXIT_TIMEOUT = 2.8;
const ENTER_STAGGER = 0.12;

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function dist(x1: number, y1: number, x2: number, y2: number) { return Math.hypot(x2 - x1, y2 - y1); }
function pick<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]!; }
function clampPoint(x: number, y: number): [number, number] {
  return [clamp(x, BOUNDS.minX, BOUNDS.maxX), clamp(y, BOUNDS.minY, BOUNDS.maxY)];
}

export function createSim(onLog: (line: LogLine) => void) {
  let logId = 1, take = 1, sceneIndex = 0, stress = 12, quality = 8, paused = false;
  let shake = 0, time = 0, timeLeft = 90, chatCooldown = 10.5, manualRescues = 0;
  let pending: Chat | null = null;
  let phase: Phase = "guion", phaseTimer = 10, map: MapId = "guion";
  let transition: Transition | null = null;
  const particles: Particle[] = [];

  const people: Person[] = CREW.map((c) => {
    const st = STATIONS.guion[c.id];
    const x = st?.x ?? c.homeX, y = st?.y ?? c.homeY;
    return {
      id: c.id, name: c.name, role: c.role, job: c.job, x, y, tx: x, ty: y,
      homeX: st?.x ?? c.homeX, homeY: st?.y ?? c.homeY, homeMap: c.homeMap,
      facing: 1 as const, state: (st?.seated ? "seated" : "work") as Mood,
      stateTimer: 0, decision: 10 + Math.random() * 6, boredom: 0, cooldown: 4,
      napping: false, partner: null, bubble: null, ring: 0, dragging: false,
      dragOffsetX: 0, dragOffsetY: 0, dragStartedAway: false, dragActivated: false, carrying: false,
      visible: true,
    };
  });
  const byId = (id: CrewId) => people.find((p) => p.id === id)!;

  function burst(kind: Particle["kind"], x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      particles.push({
        kind, x, y, vx: (Math.random() - 0.5) * 0.08,
        vy: kind === "confetti" ? -0.05 - Math.random() * 0.08 : -0.03 - Math.random() * 0.04,
        life: 0.8 + Math.random() * 0.8, max: 1.4,
        char: kind === "z" ? pick(["z", "Z"]) : kind === "tape" ? "▣" : "",
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
    const a = byId(pending.a), b = byId(pending.b);
    if (a.partner === b.id) a.partner = null;
    if (b.partner === a.id) b.partner = null;
    pending = null;
  }

  function release(p: Person) {
    p.state = "work"; p.partner = null; p.napping = false; p.dragging = false;
    p.dragStartedAway = false; p.boredom = 0; p.tx = p.homeX; p.ty = p.homeY;
    p.decision = 9 + Math.random() * 6;
  }

  /** Instant place (used only for initial spawn / emergency). */
  function placeOnMapInstant(target: MapId) {
    map = target;
    const stations = STATIONS[target];
    const doorIn = DOOR_IN[target];
    for (const p of people) {
      const st = stations[p.id];
      if (st) {
        p.x = st.x; p.y = st.y; p.tx = st.x; p.ty = st.y;
        p.homeX = st.x; p.homeY = st.y;
        p.state = st.seated ? "seated" : "work";
        p.napping = false; p.partner = null; p.carrying = false; p.dragging = false;
        p.visible = true;
      } else {
        // Not stationed here: keep near door but hidden until needed
        p.x = doorIn.x; p.y = doorIn.y; p.tx = doorIn.x; p.ty = doorIn.y;
        p.visible = false;
      }
    }
  }

  /** Walk everyone to the door, switch map, walk in to stations. */
  function startTransition(target: MapId, nextPhase: Phase, afterEnter?: () => void) {
    if (transition) return;
    if (target === map) {
      // Same map: just set stations
      placeOnMapInstant(target);
      phase = nextPhase;
      afterEnter?.();
      return;
    }
    cancelChat();
    const door = DOOR[map];
    for (const p of people) {
      if (!p.visible) continue;
      p.dragging = false;
      p.napping = false;
      p.partner = null;
      p.state = "work";
      p.tx = door.x + (Math.random() - 0.5) * 0.04;
      p.ty = door.y + (Math.random() - 0.5) * 0.03;
    }
    transition = { target, nextPhase, stage: "exit", timer: EXIT_TIMEOUT, afterEnter };
  }

  function finishExit() {
    if (!transition) return;
    const { target, nextPhase, afterEnter } = transition;
    map = target;
    phase = nextPhase;
    const stations = STATIONS[target];
    const door = DOOR[target];
    const doorIn = DOOR_IN[target];

    // Spawn at door, then walk to stations (or stay near door if not stationed)
    let i = 0;
    for (const p of people) {
      const st = stations[p.id];
      const offset = (i % 5) * 0.012;
      p.x = door.x - 0.02 - offset;
      p.y = door.y - 0.01 - (i % 3) * 0.01;
      p.visible = true;
      p.carrying = false;
      p.dragging = false;
      p.napping = false;
      p.partner = null;
      p.bubble = null;
      if (st) {
        p.homeX = st.x; p.homeY = st.y;
        p.tx = st.x; p.ty = st.y;
        p.state = "work"; // walk in first, then seat
      } else {
        p.homeX = doorIn.x; p.homeY = doorIn.y;
        p.tx = doorIn.x + (Math.random() - 0.5) * 0.06;
        p.ty = doorIn.y + (Math.random() - 0.5) * 0.04;
        p.state = "work";
      }
      p.facing = -1; // entering from right door, face left into room
      i++;
    }
    transition = { target, nextPhase, stage: "enter", timer: 2.2 + people.length * ENTER_STAGGER, afterEnter };
  }

  function finishEnter() {
    if (!transition) return;
    const { afterEnter } = transition;
    const stations = STATIONS[map];
    for (const p of people) {
      const st = stations[p.id];
      if (st) {
        p.x = st.x; p.y = st.y; p.tx = st.x; p.ty = st.y;
        p.homeX = st.x; p.homeY = st.y;
        p.state = st.seated ? "seated" : "work";
        p.visible = true;
      } else {
        // Not working in this room — leave near door but still visible briefly, then hide
        p.visible = false;
      }
    }
    const cb = afterEnter;
    transition = null;
    cb?.();
  }

  function enterPhase(next: Phase) {
    cancelChat();
    if (next === "guion") {
      startTransition("guion", "guion", () => {
        phaseTimer = 10 + Math.random() * 4;
        say(byId("guion"), "Reescribo el giro. Escritorios y biblioteca listos.", "ok");
        say(byId("director"), "Cuando el guion cierre, bajamos al set.", "dir");
      });
    } else if (next === "prep") {
      startTransition("set", "prep", () => {
        phaseTimer = 8 + Math.random() * 3;
        const makeup = byId("maquillaje"), actor = byId("actores");
        makeup.tx = actor.x - 0.04; makeup.ty = actor.y;
        say(byId("director"), "¡A sus puestos! Maquillaje, luces, cámara, caña.", "dir");
        say(makeup, "Retoco a Nina antes del ensayo.", "ok");
        say(byId("sonido"), "Caña lista. Apunto al eje de la escena.", "ok");
      });
    } else if (next === "rolling") {
      // Already on set — no door transition
      map = "set"; phase = "rolling";
      phaseTimer = 14 + Math.random() * 6; quality = Math.max(quality, 20); timeLeft = 90;
      const dir = byId("director"), chair = STATIONS.set.director!;
      dir.tx = chair.x; dir.ty = chair.y; dir.state = "seated";
      const boom = byId("sonido"), act = byId("actores");
      boom.tx = act.x + 0.1; boom.ty = act.y - 0.02;
      say(dir, "¡Acción! Silencio en el set.", "dir");
    } else if (next === "cut") {
      map = "set"; phase = "cut"; phaseTimer = 3.2; byId("director").state = "work";
      say(byId("director"), "¡Corte! Esa queda. Impriman la cinta.", "dir");
      burst("confetti", 0.5, 0.7, 14); shake = Math.max(shake, 0.55);
    } else if (next === "carry") {
      map = "set"; phase = "carry"; phaseTimer = 5;
      const editor = byId("montaje");
      editor.visible = true;
      editor.carrying = true; editor.state = "work";
      // Walk toward the door with the tape
      editor.tx = DOOR.set.x; editor.ty = DOOR.set.y;
      say(editor, "Agarro la cinta y la llevo a la sala de montaje.", "ok");
      burst("tape", editor.x, editor.y - 0.05, 3);
    } else if (next === "editing") {
      startTransition("montaje", "editing", () => {
        phaseTimer = 12 + Math.random() * 4;
        const editor = byId("montaje");
        editor.carrying = false; editor.state = "seated";
        say(editor, "En la isla. Ordeno tomas, ritmo y continuidad.", "ok");
        quality = Math.min(100, quality + 20);
      });
    } else if (next === "idle") {
      startTransition("set", "idle", () => {
        phaseTimer = 4; take += 1;
        sceneIndex = (sceneIndex + 1) % SCENES.length;
        stress = Math.max(0, stress - 20); quality = 10;
        say(byId("produccion"), `Toma ${take - 1} enlatada. Preparo la siguiente escena.`, "ok");
      });
    }
  }

  function goMap(target: MapId) {
    if (transition) return;
    if (target === "guion") enterPhase("guion");
    else if (target === "montaje") enterPhase("editing");
    else enterPhase("prep");
  }

  function advancePhase(dt: number) {
    if (paused || transition) return;
    phaseTimer -= dt;
    if (phase === "carry") {
      const editor = byId("montaje");
      if (dist(editor.x, editor.y, DOOR.set.x, DOOR.set.y) < 0.06) phaseTimer = Math.min(phaseTimer, 0.1);
    }
    if (phaseTimer > 0) return;
    if (phase === "guion") enterPhase("prep");
    else if (phase === "prep") enterPhase("rolling");
    else if (phase === "rolling") { if (quality >= 70) enterPhase("cut"); else phaseTimer = 4; }
    else if (phase === "cut") enterPhase("carry");
    else if (phase === "carry") enterPhase("editing");
    else if (phase === "editing") enterPhase("idle");
    else if (phase === "idle") enterPhase("guion");
  }

  function scold(target: Person, reason: "sleep" | "work") {
    if (target.id === "director") return;
    const director = byId("director");
    if (pending && (pending.a === target.id || pending.b === target.id)) cancelChat();
    target.napping = false; target.state = "angry"; target.stateTimer = 2.8;
    target.partner = "director"; target.boredom = 0; target.cooldown = 14;
    target.facing = director.x < target.x ? -1 : 1;
    director.state = "angry"; director.stateTimer = 1.5; director.partner = target.id;
    director.facing = target.x < director.x ? -1 : 1;
    stress = clamp(stress + (reason === "sleep" ? 10 : 16), 0, 100);
    shake = Math.max(shake, 0.9);
    if (reason === "sleep") {
      say(director, `¡${target.name}! Esto no es una siesta. A trabajar.`, "dir");
      say(target, pick(["¡Ya voy!", "Perdón. Me quedé."]), "angry");
    } else {
      say(director, `¡${target.name}! ${COMPLAINTS[target.id]}`, "dir");
      say(target, pick(ANGRY_REPLIES), "angry");
    }
  }

  function step(dt: number) {
    if (paused) return;

    // Door transition logic
    if (transition) {
      transition.timer -= dt;
      const door = DOOR[map];
      let allAtDoor = true;
      for (const p of people) {
        if (!p.visible) continue;
        if (transition.stage === "exit") {
          p.tx = door.x; p.ty = door.y;
          p.state = "work";
        }
        const d = dist(p.x, p.y, p.tx, p.ty);
        if (d > 0.008) {
          const stepDist = Math.min(d, SPEED * 1.35 * dt);
          const dx = p.tx - p.x, dy = p.ty - p.y;
          p.x += (dx / d) * stepDist; p.y += (dy / d) * stepDist;
          if (dx < -0.004) p.facing = -1; else if (dx > 0.004) p.facing = 1;
          allAtDoor = false;
        } else if (transition.stage === "exit") {
          // Vanish into the door
          p.visible = false;
        }
      }
      if (transition.stage === "exit" && (allAtDoor || transition.timer <= 0)) {
        finishExit();
      } else if (transition.stage === "enter") {
        // Seat people who reached their station
        const stations = STATIONS[map];
        let allIn = true;
        for (const p of people) {
          if (!p.visible) continue;
          if (dist(p.x, p.y, p.tx, p.ty) > 0.02) allIn = false;
          else {
            const st = stations[p.id];
            if (st?.seated) p.state = "seated";
          }
        }
        if (allIn || transition.timer <= 0) finishEnter();
      }
      time += dt;
      shake = Math.max(0, shake - dt * 1.4);
      for (const particle of particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; }
      for (let i = particles.length - 1; i >= 0; i--) if (particles[i]!.life <= 0) particles.splice(i, 1);
      return;
    }

    advancePhase(dt);
    time += dt; shake = Math.max(0, shake - dt * 1.4); chatCooldown -= dt;

    for (const p of people) {
      if (!p.visible) continue;
      if (p.bubble) { p.bubble.life -= dt; if (p.bubble.life <= 0) p.bubble = null; }
      p.ring = Math.max(0, p.ring - dt); p.cooldown = Math.max(0, p.cooldown - dt);

      if (!p.dragging && p.state === "coffee") {
        if (dist(p.x, p.y, p.tx, p.ty) < 0.05) {
          p.stateTimer -= dt;
          if (p.stateTimer <= 0) { say(p, "Café terminado. Vuelvo.", "ok"); release(p); }
        }
      } else if (!p.dragging && (p.state === "angry" || p.state === "talk" || p.state === "sleep")) {
        p.stateTimer -= dt;
        if (p.stateTimer <= 0) {
          if (p.state === "angry" && p.id !== "director") { say(p, pick(FIXED_REPLIES), "ok"); stress = clamp(stress - 6, 0, 100); }
          if (p.state === "sleep") { say(p, "Uy. Me quedé. Sigo.", "ok"); p.cooldown = 10; }
          release(p);
        }
      } else if (p.state === "work" && !p.dragging) {
        p.decision -= dt;
        const atStation = dist(p.x, p.y, p.homeX, p.homeY) < 0.05;
        if (atStation) p.boredom += dt; else p.boredom = Math.max(0, p.boredom - dt * 0.8);
        if (p.id !== "director" && atStation && p.cooldown <= 0 && !p.partner && p.decision <= 0 && phase !== "rolling") {
          p.state = "coffee"; p.stateTimer = 5.5 + Math.random() * 3; p.boredom = 0;
          p.tx = clamp(COFFEE_SPOT[0] + (Math.random() - 0.5) * 0.035, BOUNDS.minX, BOUNDS.maxX);
          p.ty = clamp(COFFEE_SPOT[1] + (Math.random() - 0.5) * 0.025, BOUNDS.minY, BOUNDS.maxY);
          p.decision = 9 + Math.random() * 6;
          say(p, "Me voy por un café.", "ok");
        }
      }

      if (p.state === "sleep" && Math.random() < dt * 1.6) burst("z", p.x, p.y - 0.1, 1);
      if (p.state === "angry" && Math.random() < dt * 2.2) burst("steam", p.x, p.y - 0.12, 1);

      const canMove = p.state === "work" || p.state === "coffee" || p.carrying;
      if (canMove && !p.dragging) {
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d > 0.008) {
          const stepDist = Math.min(d, SPEED * dt * (p.carrying ? 1.15 : 1));
          p.x += (dx / d) * stepDist; p.y += (dy / d) * stepDist;
          if (dx < -0.004) p.facing = -1; else if (dx > 0.004) p.facing = 1;
        }
      }
    }

    for (const p of people) {
      if (!p.visible) continue;
      const [x, y] = clampPoint(p.x, p.y); p.x = x; p.y = y;
    }

    if (phase === "rolling") {
      timeLeft = Math.max(0, timeLeft - dt);
      let working = 0, sleeping = 0, angry = 0;
      for (const p of people) {
        if (!p.visible) continue;
        if (p.state === "sleep") sleeping++;
        else if (p.state === "angry") angry++;
        else if ((p.state === "work" || p.state === "seated") && !p.dragging) working++;
      }
      quality = clamp(quality + (working * 0.2 - sleeping * 1.3 - angry * 0.55) * dt, 0, 100);
      stress = clamp(stress + (sleeping * 0.85 + angry * 0.35 - 0.15) * dt, 0, 100);
      if (quality >= 100) enterPhase("cut");
      else if (stress >= 100 || timeLeft <= 0) {
        say(byId("director"), "¡Corten! Esta toma no sirve.", "dir");
        quality = clamp(quality - 25, 0, 100); stress = 38; enterPhase("prep");
      }
    }

    for (const particle of particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i]!.life <= 0) particles.splice(i, 1);
  }

  function accion() {
    if (transition) return;
    paused = false;
    if (phase === "guion" || phase === "idle" || phase === "editing") { enterPhase("prep"); return; }
    if (phase === "prep") { enterPhase("rolling"); return; }
    stress = clamp(stress - 10, 0, 100);
    say(byId("director"), "¡Acción! Todos a sus puestos.", "dir");
    for (const p of people) { p.boredom = 0; p.cooldown = Math.max(p.cooldown, 6); if (p.state !== "work") release(p); }
  }

  function scoldRandom() {
    if (transition) return;
    const pool = people.filter((p) => p.id !== "director" && p.visible);
    if (!pool.length) return;
    const sleepers = pool.filter((p) => p.state === "sleep");
    const target = pick(sleepers.length ? sleepers : pool);
    scold(target, target.state === "sleep" ? "sleep" : "work");
  }

  function chaos() {
    if (transition) return;
    const pool = people.filter((p) => p.id !== "director" && p.visible);
    if (!pool.length) return;
    const target = pick(pool);
    target.state = "angry"; target.stateTimer = 3.1; target.boredom = 0;
    stress = clamp(stress + 22, 0, 100); quality = clamp(quality - 8, 0, 100);
    say(target, ISSUES[target.id as Exclude<CrewId, "director">], "angry");
    say(byId("director"), `¡${target.name}, resolvé eso!`, "dir");
  }

  function coordinate() {
    if (transition) return;
    paused = false; stress = clamp(stress - 14, 0, 100);
    const target = people.find((p) => p.visible && p.id !== "director" && (p.state === "sleep" || p.state === "angry" || p.state === "coffee"));
    if (target) { release(target); say(byId("director"), `Coordino con ${target.name}.`, "dir"); say(target, "Retomo mi puesto.", "ok"); }
    else say(byId("director"), "Equipo alineado.", "dir");
  }

  function corten() {
    if (transition) return;
    if (phase === "rolling") { enterPhase(quality >= 45 ? "cut" : "prep"); return; }
    paused = true; cancelChat(); stress = clamp(stress - 30, 0, 100);
    for (const p of people) { p.boredom = 0; if (p.state !== "work") release(p); else { p.tx = p.homeX; p.ty = p.homeY; } }
    say(byId("director"), "¡Corten! Pausa de cinco minutos.", "dir");
  }

  function grab(nx: number, ny: number): CrewId | null {
    if (transition) return null;
    let best: Person | null = null, bestD = 0.085;
    for (const p of people) {
      if (!p.visible) continue;
      const d = dist(nx, ny, p.x, p.y - 0.06); if (d < bestD) { best = p; bestD = d; }
    }
    if (!best) return null;
    best.dragStartedAway = best.state !== "work" || dist(best.x, best.y, best.homeX, best.homeY) > 0.07;
    best.dragOffsetX = best.x - nx; best.dragOffsetY = best.y - ny;
    best.dragActivated = false; best.dragging = true; best.ring = 2.2;
    return best.id;
  }

  function drag(id: CrewId, nx: number, ny: number) {
    const p = byId(id); if (!p.dragging) return;
    p.dragActivated = true;
    const [x, y] = clampPoint(nx + p.dragOffsetX, ny + p.dragOffsetY);
    p.x = x; p.y = y; p.tx = x; p.ty = y;
  }

  function cancelDrag(id: CrewId) { const p = byId(id); p.dragging = false; p.dragActivated = false; }

  function drop(id: CrewId, nx: number, ny: number) {
    const p = byId(id); if (!p.dragging) return;
    p.dragging = false; p.dragActivated = false;
    const [x, y] = clampPoint(nx + p.dragOffsetX, ny + p.dragOffsetY);
    p.x = x; p.y = y;
    const wasAway = p.dragStartedAway;
    p.boredom = 0; p.tx = p.homeX; p.ty = p.homeY;
    if (dist(nx, ny, p.homeX, p.homeY) <= 0.12) {
      p.x = p.homeX; p.y = p.homeY; p.state = "work";
      if (wasAway) {
        manualRescues = Math.min(RESCUE_GOAL, manualRescues + 1);
        quality = clamp(quality + 7, 0, 100); stress = clamp(stress - 4, 0, 100);
        say(p, "¡Bien! Recuperé mi puesto.", "ok");
      }
    } else say(p, "¡Vuelvo a mi estación!", "ok");
  }

  function focus(id: CrewId) {
    const p = byId(id);
    if (!p.visible) return;
    click(p.x, p.y - 0.06);
  }

  function click(nx: number, ny: number) {
    if (transition) return;
    let best: Person | null = null, bestD = 0.09;
    for (const p of people) {
      if (!p.visible) continue;
      const d = dist(nx, ny, p.x, p.y - 0.06); if (d < bestD) { best = p; bestD = d; }
    }
    if (!best) return;
    best.ring = 2.2;
    if (best.carrying) say(best, "Llevo la cinta a montaje.", "ok");
    else if (best.state === "sleep") say(best, "Shh… cinco minutos.", "ok");
    else if (best.state === "angry") say(best, "Ya lo estoy arreglando.", "angry");
    else if (best.state === "coffee") say(best, "Café. Arrastrame al escritorio.", "ok");
    else say(best, best.job, best.id === "director" ? "dir" : "ok");
  }

  function moodText() {
    if (transition) {
      if (transition.stage === "exit") return "Salen por el pasillo…";
      return "Entran por la puerta…";
    }
    if (paused) return "Pausa. El set respira.";
    if (phase === "guion") return "Sala de guion: escriben y reescriben.";
    if (phase === "prep") return "Prep: maquillaje, luces, cámara y caña.";
    if (phase === "rolling") return "¡Rodando! Nadie se mueve de su marca.";
    if (phase === "cut") return "¡Corte! La cinta sale del set.";
    if (phase === "carry") return "El montajista lleva la cinta a edición.";
    if (phase === "editing") return "Sala de montaje: editan la película.";
    if (people.some((p) => p.visible && p.state === "coffee")) return "Pausa de café.";
    return "Los departamentos trabajan.";
  }

  function hud(): Hud {
    return {
      take, scene: SCENES[sceneIndex] ?? SCENES[0]!, stress: Math.round(stress), quality: Math.round(quality),
      mood: moodText(), paused, timeLeft: Math.ceil(timeLeft),
      objective: phase === "guion" ? "Cerrar el guion antes de bajar al set"
        : phase === "prep" ? "Maquillaje, luces, cámara y caña en marca"
        : phase === "rolling" ? (quality >= 65 ? "Cerca de ¡corte!" : "Subí la calidad al 100%")
        : phase === "carry" ? "Lila lleva la cinta a montaje"
        : phase === "editing" ? "Editar ritmo y continuidad" : "Preparar la siguiente escena",
      stationCount: people.filter((p) => p.visible && p.state === "work" && dist(p.x, p.y, p.homeX, p.homeY) < 0.05).length,
      coffeeCount: people.filter((p) => p.visible && p.state === "coffee").length,
      manualRescues, rescueGoal: RESCUE_GOAL,
      people: people.map((p) => ({
        id: p.id, name: p.name, role: p.role, state: p.state,
        moving: p.visible && (p.state === "work" || p.state === "coffee" || p.carrying) && dist(p.x, p.y, p.tx, p.ty) > 0.02,
      })),
      phase, map, mapLabel: MAP_LABEL[map],
      transitioning: !!transition,
    };
  }

  // Initial placement without transition
  placeOnMapInstant("guion");

  return {
    people, particles, step, accion, coordinate, scold: scoldRandom, chaos, corten,
    click, grab, drag, drop, cancelDrag, focus, goMap, hud,
    get shake() { return shake; }, get map() { return map; }, get phase() { return phase; },
  };
}

export type Sim = ReturnType<typeof createSim>;
