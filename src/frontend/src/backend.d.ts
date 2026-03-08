import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface WaterEntry {
    id: bigint;
    timestamp: Time;
    amount: bigint;
}
export interface Summary {
    remaining: bigint;
    totalConsumed: bigint;
    percentage: bigint;
}
export interface backendInterface {
    deleteEntry(id: bigint): Promise<void>;
    getDailyGoal(): Promise<bigint>;
    getStreak(): Promise<bigint>;
    getTodaySummary(): Promise<Summary>;
    getTodaysEntries(): Promise<Array<WaterEntry>>;
    getWeeklyEntries(): Promise<Array<WaterEntry>>;
    logWaterIntake(amount: bigint, id: bigint): Promise<void>;
    setDailyGoal(goal: bigint): Promise<void>;
}
