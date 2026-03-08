import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Summary, WaterEntry } from "../backend.d";
import { useActor } from "./useActor";

export function useDailyGoal() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["dailyGoal"],
    queryFn: async () => {
      if (!actor) return BigInt(2000);
      return actor.getDailyGoal();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTodaySummary() {
  const { actor, isFetching } = useActor();
  return useQuery<Summary>({
    queryKey: ["todaySummary"],
    queryFn: async () => {
      if (!actor)
        return {
          remaining: BigInt(2000),
          totalConsumed: BigInt(0),
          percentage: BigInt(0),
        };
      return actor.getTodaySummary();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTodaysEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<WaterEntry[]>({
    queryKey: ["todaysEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTodaysEntries();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useLogWaterIntake() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!actor) throw new Error("No actor");
      const id = BigInt(Date.now());
      await actor.logWaterIntake(BigInt(amount), id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todaySummary"] });
      queryClient.invalidateQueries({ queryKey: ["todaysEntries"] });
    },
  });
}

export function useDeleteEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      await actor.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todaySummary"] });
      queryClient.invalidateQueries({ queryKey: ["todaysEntries"] });
    },
  });
}

export function useSetDailyGoal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (goal: number) => {
      if (!actor) throw new Error("No actor");
      await actor.setDailyGoal(BigInt(goal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyGoal"] });
      queryClient.invalidateQueries({ queryKey: ["todaySummary"] });
    },
  });
}

export function useWeeklyEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<WaterEntry[]>({
    queryKey: ["weeklyEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWeeklyEntries();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useStreak() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["streak"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getStreak();
    },
    enabled: !!actor && !isFetching,
  });
}
