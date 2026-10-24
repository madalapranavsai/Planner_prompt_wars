import { Task, Id } from "@/lib/schemas";

/**
 * Detects cycles in a directed graph of tasks using Depth First Search (DFS).
 * If a cycle is present, returns the ordered array of task IDs forming the cycle.
 * Returns null if the graph is a valid Directed Acyclic Graph (DAG).
 */
export function findCycle(tasks: readonly Task[]): string[] | null {
  const taskMap = new Map<Id, Task>();
  const adj = new Map<Id, Id[]>();

  tasks.forEach((t) => {
    taskMap.set(t.id, t);
    adj.set(t.id, [...t.dependsOn]);
  });

  const visited = new Set<Id>();
  const inStack = new Set<Id>();
  const parent = new Map<Id, Id | null>();

  function dfs(curr: Id): string[] | null {
    visited.add(curr);
    inStack.add(curr);

    const neighbors = adj.get(curr) ?? [];
    for (const neighbor of neighbors) {
      if (!taskMap.has(neighbor)) {
        // Target of dependency doesn't exist in tasks list (missing dependency)
        continue;
      }

      if (!visited.has(neighbor)) {
        parent.set(neighbor, curr);
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (inStack.has(neighbor)) {
        // Cycle detected! Reconstruct path: neighbor -> ... -> curr -> neighbor
        const path: string[] = [neighbor, curr];
        let p = parent.get(curr);
        while (p && p !== neighbor) {
          path.push(p);
          p = parent.get(p);
        }
        path.push(neighbor);
        return path.reverse();
      }
    }

    inStack.delete(curr);
    return null;
  }

  for (const t of tasks) {
    if (!visited.has(t.id)) {
      parent.set(t.id, null);
      const cycle = dfs(t.id);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Computes the topological order of tasks using Kahn's algorithm.
 * Returns { ok: true, order } where prerequisites always appear before dependents,
 * or { ok: false, error: { cycle } } if dependencies contain a cycle.
 */
export function topologicalOrder(
  tasks: readonly Task[],
): { ok: true; order: string[] } | { ok: false; error: { cycle: string[] } } {
  const cycle = findCycle(tasks);
  if (cycle) {
    return { ok: false, error: { cycle } };
  }

  const inDegree = new Map<Id, number>();
  const dependents = new Map<Id, Id[]>();
  const taskIds = new Set(tasks.map((t) => t.id));

  tasks.forEach((t) => {
    // Only count prerequisites that actually exist in the task set
    const validPrereqs = t.dependsOn.filter((p) => taskIds.has(p));
    inDegree.set(t.id, validPrereqs.length);
    dependents.set(t.id, []);
  });

  tasks.forEach((t) => {
    t.dependsOn.forEach((prereqId) => {
      if (taskIds.has(prereqId)) {
        dependents.get(prereqId)?.push(t.id);
      }
    });
  });

  // Queue of tasks with 0 prerequisites
  const queue: Id[] = [];
  tasks.forEach((t) => {
    if ((inDegree.get(t.id) ?? 0) === 0) {
      queue.push(t.id);
    }
  });

  const order: string[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);

    const deps = dependents.get(curr) ?? [];
    for (const depId of deps) {
      const remaining = (inDegree.get(depId) ?? 1) - 1;
      inDegree.set(depId, remaining);
      if (remaining === 0) {
        queue.push(depId);
      }
    }
  }

  return { ok: true, order };
}
