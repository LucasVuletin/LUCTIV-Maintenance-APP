import { Manifold, Pump } from '../core/models/prime.models';

export function orderPumps(pumps: readonly Pump[], manifolds: readonly Manifold[]): Pump[] {
  const manifoldOrder = new Map(manifolds.map((manifold, index) => [manifold.id, index]));
  return [...pumps].sort((left, right) => {
    const leftBench = left.side === 'bench' ? 1 : 0;
    const rightBench = right.side === 'bench' ? 1 : 0;
    if (leftBench !== rightBench) return leftBench - rightBench;
    const manifoldDifference = (manifoldOrder.get(left.manifoldId ?? '') ?? 999) - (manifoldOrder.get(right.manifoldId ?? '') ?? 999);
    if (manifoldDifference) return manifoldDifference;
    const sideDifference = (left.side === 'left' ? 0 : left.side === 'right' ? 1 : 2) - (right.side === 'left' ? 0 : right.side === 'right' ? 1 : 2);
    return sideDifference || left.position - right.position || left.sap.localeCompare(right.sap);
  });
}

export function pumpPositionIds(pumps: readonly Pump[], manifolds: readonly Manifold[]): Readonly<Record<string, string>> {
  return Object.fromEntries(orderPumps(pumps, manifolds).map((pump, index) => [pump.sap, `P${index + 1}`]));
}
