"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trophy, CalendarDays, CheckCircle2, Trash2, Crown, Sun, Moon, Flame } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";

interface Achievement {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDarkMode(isDark);

    const fetchAchievements = async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch achievements:", error);
      } else if (data) {
        setAchievements(data);
      }
      setIsLoaded(true);
    };

    fetchAchievements();
  }, []);

  const toggleTheme = () => {
    const newDarkState = !isDarkMode;
    setIsDarkMode(newDarkState);
    if (newDarkState) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newAchievement: Achievement = {
      id: crypto.randomUUID(),
      user_id: "default_user",
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setAchievements([newAchievement, ...achievements]);
    setInputValue("");

    const { error } = await supabase
      .from("achievements")
      .insert([newAchievement]);

    if (error) {
      console.error("Failed to insert achievement:", error);
    }

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

  const handleDelete = async (id: string) => {
    setAchievements(achievements.filter(a => a.id !== id));

    const { error } = await supabase
      .from("achievements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete achievement:", error);
    }
  };

  // Calculate Streak
  const calculateStreak = () => {
    if (achievements.length === 0) return 0;

    // Get unique dates sorted descending (newest first)
    // We only care about the YYYY-MM-DD local part to ignore time differences.
    // The previous 'date' string (e.g. 'Tue, Feb 23, 2026') is fine for display, 
    // but parsing it might be tricky across locales. Let's rely on timestamp.

    const uniqueDays = Array.from(new Set(
      achievements.map(a => new Date(a.created_at).setHours(0, 0, 0, 0))
    )).sort((a, b) => b - a);

    if (uniqueDays.length === 0) return 0;

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const msInDay = 24 * 60 * 60 * 1000;

    let streak = 0;
    let expectedDay = todayStart;

    // It's valid to have not posted *today* yet, but still have a streak if we posted *yesterday*.
    if (uniqueDays[0] === todayStart) {
      // Current streak active today
    } else if (uniqueDays[0] === todayStart - msInDay) {
      // Current streak active as of yesterday
      expectedDay = todayStart - msInDay;
    } else {
      // Streak broken
      return 0;
    }

    for (let i = 0; i < uniqueDays.length; i++) {
      // Javascript Date diff rounding can sometimes be off by an hour due to DST changes, 
      // so we check if the difference is roughly one day.
      const diffDays = Math.round((expectedDay - uniqueDays[i]) / msInDay);
      if (diffDays === 0) {
        streak++;
        expectedDay -= msInDay;
      } else {
        break; // Gap found
      }
    }

    return streak;
  };

  const streakCount = calculateStreak();

  // Group by date (keep original display string for grouping)
  const groupedAchievements = achievements.reduce((acc, ach) => {
    const dateStr = new Date(ach.created_at).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  // Sort groups by descending timestamp (newest day first)
  const sortedDateKeys = Object.keys(groupedAchievements).sort((a, b) => {
    // Get the first item in each group to determine the timestamp of the day
    const timeA = new Date(groupedAchievements[a][0].created_at).getTime();
    const timeB = new Date(groupedAchievements[b][0].created_at).getTime();
    return timeB - timeA;
  });

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
        <header className="flex flex-col gap-4 text-center sm:text-left animate-slide-up-1 relative">

          <div className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </div>

          <div className="inline-flex items-center justify-center sm:justify-start gap-3">
            <div className="inline-flex items-center gap-2 text-indigo-500 dark:text-indigo-400 font-semibold tracking-wider text-sm uppercase">
              <Trophy className="w-5 h-5" />
              <span>Achievement Tracker</span>
            </div>

            {streakCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold leading-none ring-1 ring-inset ring-orange-200 dark:ring-orange-500/20">
                <Flame className="w-3.5 h-3.5 fill-current" />
                {streakCount} Day Streak
              </div>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2">
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
          {sortedDateKeys.length === 0 ? (
            <div className="text-center py-20 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300">No achievements yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Start your streak by adding your first win above.</p>
            </div>
          ) : (
            sortedDateKeys.map((date) => {
              const items = groupedAchievements[date];
              // Sort items within a day from newest to oldest
              const sortedItems = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              return (
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
                    {sortedItems.map((ach) => (
                      <div
                        key={ach.id}
                        className="group flex items-start sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all sm:hover:-translate-y-0.5"
                      >
                        <div className="flex items-start sm:items-center gap-4">
                          <div className="mt-0.5 sm:mt-0 min-w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-snug">
                              {ach.content}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {new Date(ach.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
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
              )
            })
          )}
        </section>

      </div>
    </main>
  );
}
