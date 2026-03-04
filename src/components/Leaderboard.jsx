import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const RANK_STYLES = [
  {
    bg: "linear-gradient(135deg, #f59e0b, #f97316)",
    text: "#000",
    glow: "rgba(245,158,11,0.4)",
  },
  {
    bg: "linear-gradient(135deg, #94a3b8, #cbd5e1)",
    text: "#000",
    glow: "rgba(148,163,184,0.3)",
  },
  {
    bg: "linear-gradient(135deg, #b45309, #d97706)",
    text: "#000",
    glow: "rgba(180,83,9,0.3)",
  },
  { bg: "rgba(255,255,255,0.08)", text: "#a1a1aa", glow: "transparent" },
  { bg: "rgba(255,255,255,0.08)", text: "#a1a1aa", glow: "transparent" },
];

export default function Leaderboard({ onViewProfile }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, nba_bucks, avatar_url")
        .order("nba_bucks", { ascending: false })
        .limit(5);
      setLeaders(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #0f0f1a 0%, #151525 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: "80px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}
        >
          🏆
        </div>
        <div>
          <p className="text-white text-sm font-bold tracking-tight">
            Leaderboard
          </p>
          <p className="text-zinc-600 text-xs">Top NBA Bucks</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))
          : leaders.map((user, i) => {
              const style = RANK_STYLES[i];
              const isTop3 = i < 3;

              return (
                <div
                  key={user.username}
                  onClick={() => onViewProfile?.(user.username)}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition group"
                  style={{
                    background: isTop3
                      ? "rgba(249,115,22,0.05)"
                      : "rgba(255,255,255,0.02)",
                    border: isTop3
                      ? "1px solid rgba(249,115,22,0.1)"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isTop3
                      ? "rgba(249,115,22,0.05)"
                      : "rgba(255,255,255,0.02)";
                  }}
                >
                  {/* Rank badge */}
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: style.bg,
                      color: style.text,
                      boxShadow: isTop3 ? `0 0 8px ${style.glow}` : "none",
                    }}
                  >
                    {i + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.username?.[0]?.toUpperCase()
                    )}
                  </div>

                  {/* Name & bucks */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate group-hover:text-orange-400 transition">
                      @{user.username}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      💰 {(user.nba_bucks ?? 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Crown for #1 */}
                  {i === 0 && <span className="text-sm flex-shrink-0">👑</span>}
                </div>
              );
            })}
      </div>
    </div>
  );
}
