"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trophy, CalendarDays, CheckCircle2, Trash2, Crown } from "lucide-react";
import confetti from "canvas-confetti";

interface Achievement {
  id: string;
  text: string;
  date: string;
  timestamp: number;
}

export default function Home() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("daily_achievements");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAchievements(parsed);
      } catch {
        console.error("Failed to parse achievements");
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("daily_achievements", JSON.stringify(achievements));
    }
  }, [achievements, isLoaded]);

  const handleAddAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const newAchievement: Achievement = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      date: dateString,
      timestamp: now.getTime(),
    };

    setAchievements([newAchievement, ...achievements]);
    setInputValue("");

    // Trigger Success Animation using standard confetti
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      ticks: 200
    });

    // Play a subtle success sound
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.exponentialRampToValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Ignore audio errors if browser blocks auto-play or AudioContext is unsupported
    }
  };

  const handleDelete = (id: string) => {
    setAchievements(achievements.filter(a => a.id !== id));
  };

  // Group by date
  const groupedAchievements = achievements.reduce((acc, ach) => {
    if (!acc[ach.date]) {
      acc[ach.date] = [];
    }
    acc[ach.date].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const todayString = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  if (!isLoaded) return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-pulse w-8 h-8 rounded-full bg-indigo-500"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20 flex flex-col gap-10">

        {/* Header */}
        <header className="flex flex-col gap-4 text-center sm:text-left animate-slide-up-1">
          <div className="inline-flex items-center justify-center sm:justify-start gap-2 text-indigo-500 dark:text-indigo-400 font-semibold tracking-wider text-sm uppercase">
            <Trophy className="w-5 h-5" />
            <span>Achievement Tracker</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Today is <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
              {todayString}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto sm:mx-0">
            Small wins stack up. What have you accomplished today?
          </p>
        </header>

        {/* Input Form */}
        <div className="relative group animate-slide-up-2">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <form onSubmit={handleAddAchievement} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex items-center shadow-sm">
            <div className="pl-4 pr-2 text-slate-400 dark:text-slate-500">
              <Crown className="w-6 h-6" />
            </div>
            <input
              type="text"
              placeholder="I shipped a new feature..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-lg placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-0"
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-indigo-500 disabled:active:scale-100 flex items-center justify-center font-medium shadow-sm"
            >
              <Plus className="w-6 h-6 sm:hidden" />
              <span className="hidden sm:inline-block px-3">Add Win</span>
            </button>
          </form>
        </div>

        {/* Achievements List */}
        <section className="mt-4 flex flex-col gap-8 animate-slide-up-3">
          {Object.entries(groupedAchievements).length === 0 ? (
            <div className="text-center py-20 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300">No achievements yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Start your streak by adding your first win above.</p>
            </div>
          ) : (
            Object.entries(groupedAchievements).map(([date, items]) => (
              <div key={date} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-1.5 rounded-full ring-1 ring-inset ring-slate-200 dark:ring-slate-800">
                    <CalendarDays className="w-4 h-4" />
                    {date}
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                </div>

                <div className="grid gap-3">
                  {items.map((ach) => (
                    <div
                      key={ach.id}
                      className="group flex items-start sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all sm:hover:-translate-y-0.5"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="mt-0.5 sm:mt-0 min-w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-snug">
                          {ach.text}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(ach.id)}
                        className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 shrink-0 mt-1 sm:mt-0"
                        aria-label="Delete achievement"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </main>
  );
}
