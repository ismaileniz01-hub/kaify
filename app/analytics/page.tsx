"use client";

import Link from "next/link";
import { Activity, ArrowLeft, Droplets, Dumbbell, Flame, Moon } from "lucide-react";
import { MacroRing } from "@/components/analytics/MacroRing";
import { StatCard } from "@/components/analytics/StatCard";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";

export default function AnalyticsPage() {
  return (
    <div className="phone-shell analytics-gradient relative flex flex-col">
      <header className="animate-in animate-in--1 flex items-center justify-between px-4 pb-2 pt-12">
        <Link
          href="/welcome"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Geri"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-medium text-white">
          Analiz
        </h1>
        <div className="h-9 w-9" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="animate-in animate-in--2">
            <StatCard
              icon={Activity}
              label="Weight"
              value="78.4 kg"
              trend="▼ 1.2kg this week"
              barColor="#3b82f6"
              barPercent={62}
              gradient="blue"
            />
          </div>
          <div className="animate-in animate-in--3">
            <StatCard
              icon={Flame}
              label="Calories"
              value="1,840"
              trend="▲ On target"
              barColor="#f97316"
              barPercent={85}
              gradient="orange"
            />
          </div>
          <div className="animate-in animate-in--4">
            <StatCard
              icon={Dumbbell}
              label="Workouts"
              value="4 / 5"
              trend="This week"
              trendPositive={false}
              barColor="#22c55e"
              barPercent={80}
              gradient="green"
            />
          </div>
          <div className="animate-in animate-in--5">
            <StatCard
              icon={Droplets}
              label="Hydration"
              value="2.1 L"
              trend="▲ 82% of goal"
              barColor="#06b6d4"
              barPercent={82}
              gradient="water"
            />
          </div>
        </div>

        <div className="animate-in animate-in--6 mt-3">
          <WeeklyChart />
        </div>

        <div className="animate-in animate-in--7 mt-3 grid grid-cols-3 gap-2.5">
          <MacroRing
            label="Protein"
            value="142g"
            percent={72}
            color="#3b82f6"
            gradient="blue"
          />
          <MacroRing
            label="Carbs"
            value="210g"
            percent={55}
            color="#22c55e"
            gradient="green"
          />
          <MacroRing
            label="Fat"
            value="58g"
            percent={80}
            color="#f97316"
            gradient="orange"
          />
        </div>
      </main>
    </div>
  );
}
