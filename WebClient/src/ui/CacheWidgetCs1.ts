import type { CacheInterfaceComponent } from '../cache/CacheInterfaceDefinitions';
import type { Rev240UiState } from '../protocol/Rev240UiState';

/**
 * Minimal legacy CS1 evaluator for cache text substitutions. Operations use
 * server-delivered skill/varp state; missing inputs remain unknown rather than
 * being fabricated. Unsupported operations do not execute.
 */
export function evaluateWidgetCs1(
  code: ReadonlyArray<number>, state: Rev240UiState,
): number | null {
  let pc = 0;
  let result = 0;
  let pending = 0; // 0 add, 1 subtract, 2 divide, 3 multiply
  while (pc < code.length) {
    const opcode = code[pc++]!;
    if (opcode === 0) return result;
    if (opcode === 15) { pending = 1; continue; }
    if (opcode === 16) { pending = 2; continue; }
    if (opcode === 17) { pending = 3; continue; }
    let operand: number | null = null;
    const arg = (): number | null => pc < code.length ? code[pc++]! : null;
    switch (opcode) {
      case 1: // boosted level
      case 2: // base level from experience
      case 3: { // experience
        const id = arg();
        if (id === null) return null;
        const skill = state.skills.get(id);
        if (!skill) return null;
        operand = opcode === 1 ? skill.currentLevel :
          opcode === 2 ? levelForExperience(skill.experience) : skill.experience;
        break;
      }
      case 5: {
        const id = arg();
        if (id === null) return null;
        operand = state.varps.get(id) ?? null;
        break;
      }
      case 7: {
        const id = arg();
        if (id === null) return null;
        const varp = state.varps.get(id);
        operand = varp === undefined ? null : Math.floor(varp * 100 / 46875);
        break;
      }
      case 13: {
        const id = arg(), bit = arg();
        if (id === null || bit === null) return null;
        const varp = state.varps.get(id);
        operand = varp === undefined || bit > 31 ? null : ((varp >>> bit) & 1);
        break;
      }
      case 14: {
        const id = arg();
        if (id === null) return null;
        operand = state.varbit(id);
        break;
      }
      case 20:
        operand = arg();
        break;
      default:
        return null;
    }
    if (operand === null) return null;
    if (pending === 1) result -= operand;
    else if (pending === 2) {
      if (operand !== 0) result = Math.trunc(result / operand);
    } else if (pending === 3) result *= operand;
    else result += operand;
    pending = 0;
  }
  return null;
}

export function interpolateCacheText(
  component: Pick<CacheInterfaceComponent, 'text' | 'cs1Programs'>,
  state: Rev240UiState,
): string {
  const text = component.text ?? '';
  return text.replace(/%([1-5])/g, (match, index: string) => {
    const program = component.cs1Programs[Number(index) - 1];
    if (!program) return match;
    const value = evaluateWidgetCs1(program, state);
    return value === null ? '—' : String(value);
  });
}

function levelForExperience(experience: number): number {
  let points = 0;
  let level = 1;
  for (let next = 1; next < 99; next++) {
    points += Math.floor(next + 300 * Math.pow(2, next / 7));
    if (Math.floor(points / 4) > experience) break;
    level = next + 1;
  }
  return level;
}
