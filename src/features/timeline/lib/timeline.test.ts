import { describe, it, expect } from "vitest";
import { Task } from "@/lib/schemas";
import { topologicalOrder, findCycle } from "./graph";
import { computeSchedule } from "./schedule";
import { applyTaskUpdate, rescheduleForNewDate } from "./cascade";

describe("Timeline Engine (Graph, Scheduling & Cascade)", () => {
  const sampleTasks: Task[] = [
    {
      id: "t1",
      title: "Finalize Venue",
      durationDays: 14,
      dependsOn: [],
      deadlineOffsetDays: 90,
      status: "todo",
      delayDays: 0,
      origin: "template",
    },
    {
      id: "t2",
      title: "Book Decor",
      durationDays: 10,
      dependsOn: ["t1"],
      deadlineOffsetDays: 60,
      status: "todo",
      delayDays: 0,
      origin: "template",
    },
    {
      id: "t3",
      title: "Print Invitations",
      durationDays: 7,
      dependsOn: ["t1"],
      deadlineOffsetDays: 45,
      status: "todo",
      delayDays: 0,
      origin: "template",
    },
    {
      id: "t4",
      title: "Send Invitations",
      durationDays: 5,
      dependsOn: ["t3"],
      deadlineOffsetDays: 30,
      status: "todo",
      delayDays: 0,
      origin: "template",
    },
  ];

  const today = "2027-01-01";
  const eventDate = "2027-06-01";

  it("computes valid topological order", () => {
    const res = topologicalOrder(sampleTasks);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.order.indexOf("t1")).toBeLessThan(res.order.indexOf("t2"));
      expect(res.order.indexOf("t1")).toBeLessThan(res.order.indexOf("t3"));
      expect(res.order.indexOf("t3")).toBeLessThan(res.order.indexOf("t4"));
    }
  });

  it("detects circular dependencies and reports cycle path", () => {
    const cyclicTasks: Task[] = [
      {
        id: "a",
        title: "Task A",
        durationDays: 5,
        dependsOn: ["b"],
        deadlineOffsetDays: 10,
        status: "todo",
        delayDays: 0,
        origin: "user",
      },
      {
        id: "b",
        title: "Task B",
        durationDays: 5,
        dependsOn: ["a"],
        deadlineOffsetDays: 10,
        status: "todo",
        delayDays: 0,
        origin: "user",
      },
    ];

    const cycle = findCycle(cyclicTasks);
    expect(cycle).not.toBeNull();
    expect(cycle).toContain("a");
    expect(cycle).toContain("b");

    const res = topologicalOrder(cyclicTasks);
    expect(res.ok).toBe(false);
  });

  it("computes forward pass, backward pass, and slack correctly", () => {
    const sched = computeSchedule(sampleTasks, eventDate, today);
    expect(sched.ok).toBe(true);
    if (sched.ok) {
      const t1 = sched.schedule.find((s) => s.taskId === "t1")!;
      const t2 = sched.schedule.find((s) => s.taskId === "t2")!;

      // t2 start must be >= t1 end
      expect(t2.earliestStart).toBe(t1.earliestEnd);

      // Invariant: no date clamping to event date; slack computed
      sched.schedule.forEach((s) => {
        expect(typeof s.slackDays).toBe("number");
      });
    }
  });

  it("propagates cascade alerts when a predecessor task is delayed", () => {
    // Delay Venue (t1) by 30 days
    const result = applyTaskUpdate(
      sampleTasks,
      { taskId: "t1", delayDays: 30 },
      { eventDate, today },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const delayedT1 = result.tasks.find((t) => t.id === "t1")!;
      expect(delayedT1.status).toBe("delayed");
      expect(delayedT1.delayDays).toBe(30);

      const scheduledT2 = result.schedule.find((s) => s.taskId === "t2")!;
      // t2 start should have shifted by 30 days
      expect(scheduledT2.earliestStart).toBe("2027-02-14");
    }
  });

  it("flags startsBeforeToday when event date moves significantly earlier", () => {
    // Move event to 1 week from today
    const earlyEvent = "2027-01-08";
    const res = rescheduleForNewDate(sampleTasks, earlyEvent, today);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.alerts.length).toBeGreaterThan(0);
      const flagged = res.schedule.filter((s) => s.startsBeforeToday);
      expect(flagged.length).toBeGreaterThan(0);
    }
  });
});
