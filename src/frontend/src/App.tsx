import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  useDailyGoal,
  useDeleteEntry,
  useLogWaterIntake,
  useSetDailyGoal,
  useStreak,
  useTodaySummary,
  useTodaysEntries,
  useWeeklyEntries,
} from "@/hooks/useQueries";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Droplets,
  Flame,
  Loader2,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { WaterEntry } from "./backend.d";

// --- Circular progress ring ---
function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 88;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      className="ring-glow"
      role="img"
      aria-label="Hydration progress ring"
    >
      <defs>
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.82 0.20 195)" />
          <stop offset="100%" stopColor="oklch(0.60 0.20 215)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        fill="none"
        stroke="oklch(0.28 0.04 230)"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        fill="none"
        stroke="url(#waterGradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${radius} ${radius})`}
        filter="url(#glow)"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

// --- Format nanosecond timestamp ---
function formatTime(nsTimestamp: bigint): string {
  const ms = Number(nsTimestamp / BigInt(1_000_000));
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// --- Log entry row ---
function EntryRow({
  entry,
  index,
  onDelete,
  isDeleting,
}: {
  entry: WaterEntry;
  index: number;
  onDelete: (id: bigint) => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      data-ocid={`log.item.${index}`}
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/50 border border-border/40 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-water/15 text-water">
          <Droplets size={14} />
        </div>
        <div>
          <span className="font-display font-semibold text-foreground text-sm">
            {Number(entry.amount)} ml
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatTime(entry.timestamp)}
          </p>
        </div>
      </div>
      <Button
        data-ocid={`log.delete_button.${index}`}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(entry.id)}
        disabled={isDeleting}
        aria-label={`Delete ${Number(entry.amount)}ml entry`}
      >
        {isDeleting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
      </Button>
    </motion.div>
  );
}

// --- Weekly chart data helpers ---
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildWeeklyChartData(entries: WaterEntry[], goalMl: number) {
  // Build last 7 days including today
  const today = new Date();
  const days: { day: string; date: string; ml: number; isToday: boolean }[] =
    [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
    days.push({
      day: DAY_LABELS[d.getDay()],
      date: dateKey,
      ml: 0,
      isToday: i === 0,
    });
  }

  // Aggregate entries by date
  for (const entry of entries) {
    const ms = Number(entry.timestamp / BigInt(1_000_000));
    const entryDate = new Date(ms).toISOString().split("T")[0];
    const dayEntry = days.find((d) => d.date === entryDate);
    if (dayEntry) {
      dayEntry.ml += Number(entry.amount);
    }
  }

  return days.map((d) => ({
    ...d,
    fill: d.isToday ? "oklch(0.72 0.18 200)" : "oklch(0.32 0.06 225)",
    goalLine: goalMl,
  }));
}

const chartConfig: ChartConfig = {
  ml: {
    label: "Water (ml)",
    color: "oklch(0.72 0.18 200)",
  },
};

// --- Weekly Chart + Streak Row ---
function WeeklyStatsSection({
  entries,
  streak,
  goalMl,
  isLoading,
}: {
  entries: WaterEntry[];
  streak: bigint;
  goalMl: number;
  isLoading: boolean;
}) {
  const chartData = buildWeeklyChartData(entries, goalMl);
  const streakNum = Number(streak);

  return (
    <section className="mb-6" data-ocid="chart.section">
      <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-3">
        Weekly Overview
      </h2>

      {/* Stats row: streak card + chart */}
      <div className="flex gap-3">
        {/* Streak card */}
        <motion.div
          data-ocid="streak.card"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 min-w-[88px] shrink-0"
        >
          {isLoading ? (
            <>
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-10 h-4 mt-1" />
              <Skeleton className="w-14 h-3 mt-0.5" />
            </>
          ) : (
            <>
              <motion.div
                animate={{
                  scale: streakNum > 0 ? [1, 1.15, 1] : 1,
                }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  streakNum > 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <Flame size={18} />
              </motion.div>
              <motion.span
                key={streakNum}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="font-display font-bold text-2xl text-foreground leading-none"
              >
                {streakNum}
              </motion.span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                day streak
              </span>
            </>
          )}
        </motion.div>

        {/* Bar chart */}
        <div
          data-ocid="chart.canvas_target"
          className="glass-card rounded-2xl flex-1 p-3 min-w-0"
        >
          {isLoading ? (
            <Skeleton className="w-full h-[140px] rounded-xl" />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: "140px" }}
            >
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                barSize={18}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="oklch(0.28 0.04 230 / 0.6)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "oklch(0.58 0.05 225)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "oklch(0.58 0.05 225)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${v / 1000}k` : `${v}`
                  }
                />
                <ReferenceLine
                  y={goalMl}
                  stroke="oklch(0.72 0.18 200 / 0.5)"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Goal",
                    position: "insideTopRight",
                    fontSize: 9,
                    fill: "oklch(0.72 0.18 200 / 0.7)",
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [
                        `${Number(value).toLocaleString()} ml`,
                        "Water",
                      ]}
                      labelClassName="font-display text-xs"
                    />
                  }
                  cursor={{ fill: "oklch(0.28 0.04 230 / 0.4)" }}
                />
                <Bar dataKey="ml" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </section>
  );
}

// --- Reminder feature ---
const REMINDER_INTERVALS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
];

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "0:00";
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ReminderSection() {
  const [enabled, setEnabled] = useState(false);
  const [intervalMin, setIntervalMin] = useState<string>(() => {
    return localStorage.getItem("hydrotrack_reminder_interval") ?? "30";
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAll() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  function fireReminder() {
    const canNotify =
      "Notification" in window && Notification.permission === "granted";
    if (canNotify) {
      new Notification("HydroTrack Reminder", {
        body: "Time to drink water! Stay hydrated 💧",
        icon: "/assets/fonts/../favicon.ico",
      });
    } else {
      toast("Time to drink water! Stay hydrated 💧", {
        icon: <Droplets size={16} className="text-water" />,
        duration: 6000,
      });
    }
  }

  async function startReminder(minutes: number) {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const totalSeconds = minutes * 60;
    setSecondsLeft(totalSeconds);

    // Countdown ticker
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return totalSeconds;
        return prev - 1;
      });
    }, 1000);

    // Main interval
    intervalRef.current = setInterval(() => {
      fireReminder();
      setSecondsLeft(totalSeconds);
    }, totalSeconds * 1000);
  }

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    if (checked) {
      startReminder(Number(intervalMin));
    } else {
      clearAll();
      setSecondsLeft(0);
    }
  }

  function handleIntervalChange(val: string) {
    setIntervalMin(val);
    localStorage.setItem("hydrotrack_reminder_interval", val);
    if (enabled) {
      clearAll();
      startReminder(Number(val));
    }
  }

  // Cleanup on unmount — refs are stable, no deps needed
  // biome-ignore lint/correctness/useExhaustiveDependencies: clearAll only reads stable refs
  useEffect(() => {
    return () => clearAll();
  }, []);

  return (
    <div
      data-ocid="reminder.section"
      className="mt-4 pt-4 border-t border-border/30"
    >
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5">
        <Bell size={11} />
        Reminders
      </p>

      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-display font-medium text-foreground">
            Hydration reminders
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled ? "Active" : "Start getting nudged to drink water"}
          </p>
        </div>
        <Switch
          data-ocid="reminder.toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          aria-label="Enable hydration reminders"
          className="data-[state=checked]:bg-water"
        />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Label
          htmlFor="reminder-interval"
          className="text-xs text-muted-foreground shrink-0"
        >
          Every
        </Label>
        <Select
          value={intervalMin}
          onValueChange={handleIntervalChange}
          disabled={!enabled}
        >
          <SelectTrigger
            id="reminder-interval"
            data-ocid="reminder.select"
            className="h-8 text-xs bg-input border-border/60 focus:border-water/60 font-display flex-1"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border/60">
            {REMINDER_INTERVALS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-xs font-display"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence>
        {enabled && secondsLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-water/10 border border-water/20">
              <Bell size={12} className="text-water shrink-0" />
              <p className="text-xs text-water font-display font-medium">
                Next reminder in{" "}
                <span className="font-bold tabular-nums">
                  {formatCountdown(secondsLeft)}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  const customInputRef = useRef<HTMLInputElement>(null);

  const { data: goal, isLoading: goalLoading } = useDailyGoal();
  const { data: summary, isLoading: summaryLoading } = useTodaySummary();
  const { data: entries, isLoading: entriesLoading } = useTodaysEntries();
  const { data: weeklyEntries, isLoading: weeklyLoading } = useWeeklyEntries();
  const { data: streak, isLoading: streakLoading } = useStreak();

  const logMutation = useLogWaterIntake();
  const deleteMutation = useDeleteEntry();
  const setGoalMutation = useSetDailyGoal();

  const isInitialLoading = goalLoading || summaryLoading || entriesLoading;
  const isStatsLoading = weeklyLoading || streakLoading || goalLoading;

  const percentage = summary ? Number(summary.percentage) : 0;
  const totalConsumed = summary ? Number(summary.totalConsumed) : 0;
  const goalMl = goal ? Number(goal) : 2000;

  const sortedEntries = entries
    ? [...entries].sort((a, b) => Number(b.timestamp - a.timestamp))
    : [];

  async function handleQuickAdd(amount: number) {
    try {
      await logMutation.mutateAsync(amount);
      toast.success(`+${amount} ml logged!`, {
        icon: <Droplets size={16} className="text-water" />,
      });
    } catch {
      toast.error("Failed to log water intake");
    }
  }

  async function handleCustomAdd() {
    const amt = Number.parseInt(customAmount, 10);
    if (!amt || amt <= 0 || amt > 5000) {
      toast.error("Enter a valid amount (1–5000 ml)");
      return;
    }
    try {
      await logMutation.mutateAsync(amt);
      toast.success(`+${amt} ml logged!`, {
        icon: <Droplets size={16} className="text-water" />,
      });
      setCustomAmount("");
      setShowCustomInput(false);
    } catch {
      toast.error("Failed to log water intake");
    }
  }

  async function handleDelete(id: bigint) {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Entry removed");
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveGoal() {
    const val = Number.parseInt(goalInput, 10);
    if (!val || val < 100 || val > 10000) {
      toast.error("Goal must be between 100 and 10,000 ml");
      return;
    }
    try {
      await setGoalMutation.mutateAsync(val);
      toast.success("Daily goal updated!", {
        icon: <CheckCircle2 size={16} className="text-water" />,
      });
      setGoalInput("");
    } catch {
      toast.error("Failed to update goal");
    }
  }

  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Atmospheric background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.28 0.08 215 / 0.4) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 80% 100%, oklch(0.22 0.06 200 / 0.25) 0%, transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative max-w-md mx-auto px-4 pb-12 pt-0">
        {/* Header */}
        <header
          data-ocid="header.section"
          className="flex items-center justify-between py-6"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center water-glow bg-water/20">
              <Droplets size={18} className="text-water" />
            </div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">
              HydroTrack
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{today}</p>
        </header>

        {/* Progress Section */}
        <section data-ocid="progress.section" className="mb-6">
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
            <div className="relative flex items-center justify-center mb-4">
              {isInitialLoading ? (
                <Skeleton className="w-44 h-44 rounded-full" />
              ) : (
                <>
                  <ProgressRing percentage={percentage} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      key={percentage}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="font-display text-3xl font-bold text-foreground"
                    >
                      {percentage}%
                    </motion.span>
                    <span className="text-xs text-muted-foreground mt-1">
                      of daily goal
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center">
              {isInitialLoading ? (
                <Skeleton className="h-6 w-40 mx-auto" />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    Today's intake
                  </p>
                  <p className="font-display font-bold text-2xl">
                    <span className="text-water">{totalConsumed}</span>
                    <span className="text-muted-foreground text-base font-normal mx-1">
                      /
                    </span>
                    <span className="text-foreground">{goalMl} ml</span>
                  </p>
                </motion.div>
              )}
            </div>

            {/* Hydration status indicator */}
            {!isInitialLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-3"
              >
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    percentage >= 100
                      ? "bg-emerald-500/20 text-emerald-400"
                      : percentage >= 60
                        ? "bg-water/20 text-water"
                        : percentage >= 30
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {percentage >= 100
                    ? "🎉 Goal reached!"
                    : percentage >= 60
                      ? "💧 Going well"
                      : percentage >= 30
                        ? "⚡ Keep going"
                        : "🌊 Start hydrating"}
                </span>
              </motion.div>
            )}
          </div>
        </section>

        {/* Weekly Stats Section (chart + streak) */}
        <WeeklyStatsSection
          entries={weeklyEntries ?? []}
          streak={streak ?? BigInt(0)}
          goalMl={goalMl}
          isLoading={isStatsLoading}
        />

        {/* Quick Add Section */}
        <section className="mb-6">
          <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Quick Add
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { amount: 150, label: "150ml" },
              { amount: 250, label: "250ml" },
              { amount: 500, label: "500ml" },
            ].map(({ amount, label }, i) => (
              <motion.div key={amount} whileTap={{ scale: 0.95 }}>
                <Button
                  data-ocid={`quickadd.primary_button.${i + 1}`}
                  className="w-full h-14 flex flex-col gap-0.5 bg-secondary hover:bg-water/20 hover:text-water hover:border-water/40 border border-border/60 text-foreground font-display font-semibold transition-all"
                  variant="outline"
                  onClick={() => handleQuickAdd(amount)}
                  disabled={logMutation.isPending}
                >
                  <Droplets size={14} className="text-water" />
                  <span className="text-xs">{label}</span>
                </Button>
              </motion.div>
            ))}
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                data-ocid="quickadd.custom_button"
                className="w-full h-14 flex flex-col gap-0.5 bg-secondary hover:bg-water/20 hover:text-water hover:border-water/40 border border-border/60 text-foreground font-display font-semibold transition-all"
                variant="outline"
                onClick={() => {
                  setShowCustomInput((v) => !v);
                  setTimeout(() => customInputRef.current?.focus(), 50);
                }}
              >
                <Plus size={14} className="text-water" />
                <span className="text-xs">Custom</span>
              </Button>
            </motion.div>
          </div>

          {/* Custom amount input */}
          <AnimatePresence>
            {showCustomInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-1">
                  <Input
                    data-ocid="custom.input"
                    ref={customInputRef}
                    type="number"
                    min={1}
                    max={5000}
                    placeholder="Amount in ml..."
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
                    className="bg-secondary border-border/60 focus:border-water/60 focus:ring-water/30 font-display placeholder:text-muted-foreground/50"
                  />
                  <Button
                    data-ocid="custom.submit_button"
                    className="bg-water text-primary-foreground hover:opacity-90 font-display font-semibold water-glow"
                    onClick={handleCustomAdd}
                    disabled={logMutation.isPending}
                  >
                    {logMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Today's Log */}
        <section className="mb-6">
          <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Today's Log
          </h2>

          {entriesLoading ? (
            <div className="space-y-2" data-ocid="log.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
              ))}
            </div>
          ) : sortedEntries.length === 0 ? (
            <motion.div
              data-ocid="log.empty_state"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-8 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-water/10 flex items-center justify-center mb-3">
                <Droplets size={24} className="text-water/50" />
              </div>
              <p className="font-display font-semibold text-foreground">
                No water logged yet today
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start tracking your hydration with the quick-add buttons above.
              </p>
            </motion.div>
          ) : (
            <div data-ocid="log.list" className="space-y-2">
              <AnimatePresence initial={false}>
                {sortedEntries.map((entry, i) => (
                  <EntryRow
                    key={entry.id.toString()}
                    entry={entry}
                    index={i + 1}
                    onDelete={handleDelete}
                    isDeleting={deletingId === entry.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="glass-card rounded-2xl overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
          >
            <div className="flex items-center gap-2.5">
              <Settings size={16} className="text-muted-foreground" />
              <span className="font-display font-semibold text-sm text-foreground">
                Settings
              </span>
            </div>
            <motion.div
              animate={{ rotate: settingsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} className="text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 border-t border-border/40">
                  {/* Daily Goal */}
                  <label
                    htmlFor="daily-goal-input"
                    className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider"
                  >
                    Daily Goal (ml)
                  </label>
                  <p className="text-xs text-muted-foreground/70 mb-3">
                    Current goal:{" "}
                    <span className="text-water font-semibold">
                      {goalMl} ml
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="daily-goal-input"
                      data-ocid="settings.input"
                      type="number"
                      min={100}
                      max={10000}
                      placeholder={`${goalMl} ml`}
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveGoal()}
                      className="bg-input border-border/60 focus:border-water/60 focus:ring-water/30 font-display placeholder:text-muted-foreground/40"
                    />
                    <Button
                      data-ocid="settings.save_button"
                      className="bg-water text-primary-foreground hover:opacity-90 font-display font-semibold shrink-0 water-glow"
                      onClick={handleSaveGoal}
                      disabled={setGoalMutation.isPending}
                    >
                      {setGoalMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>

                  {/* Reminders subsection */}
                  <ReminderSection />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
            >
              Built with ♥ using caffeine.ai
            </a>
          </p>
        </footer>
      </div>

      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: "oklch(0.17 0.025 235)",
            border: "1px solid oklch(0.28 0.04 230)",
            color: "oklch(0.94 0.01 220)",
          },
        }}
      />
    </div>
  );
}
