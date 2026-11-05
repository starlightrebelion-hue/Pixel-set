import type { CrewId } from "@/game/crew";

/** Economía del estudio: presupuesto, sueldos y plantilla. */
export type Level = 0 | 1 | 2;
export const LEVEL_NAME = ["Vacante", "Junior", "Senior"] as const;
export const SALARY: Record<Level, number> = { 0: 0, 1: 120, 2: 260 };
export const HIRE_FEE: Record<1 | 2, number> = { 1: 800, 2: 1800 };
export const UPGRADE_FEE = 1200;
export const SEVERANCE: Record<Level, number> = { 0: 0, 1: 200, 2: 400 };
export const START_BUDGET = 6000;
export const BANKRUPT_AT = -3000;
export const INCOME = { perStar: 900, goodBonus: 600, chapterPrize: 2000 };

export type LedgerEntry = { id: number; label: string; amount: number };
export type StaffView = {
  id: CrewId; level: Level; levelName: string; salary: number;
  canFire: boolean; hireJunior: number | null; hireSenior: number | null; upgrade: number | null; severance: number;
};

export const initialStaff = (ids: CrewId[]): Record<CrewId, Level> =>
  Object.fromEntries(ids.map((id) => [id, id === "director" ? 2 : 1])) as Record<CrewId, Level>;

export const payrollOf = (staff: Record<CrewId, Level>) => (Object.values(staff) as Level[]).reduce<number>((a, l) => a + SALARY[l], 0);

export function staffView(id: CrewId, level: Level, feeMul = 1): StaffView {
  return {
    id, level, levelName: LEVEL_NAME[level], salary: SALARY[level],
    canFire: id !== "director" && level > 0,
    hireJunior: level === 0 ? Math.round(HIRE_FEE[1] * feeMul) : null,
    hireSenior: level === 0 ? Math.round(HIRE_FEE[2] * feeMul) : null,
    upgrade: level === 1 ? Math.round(UPGRADE_FEE * feeMul) : null,
    severance: SEVERANCE[level],
  };
}
