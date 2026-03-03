import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { moderateContent } from "../utils/moderate";

const NBA_TEAM_COLORS = {
  ATL: "#C1272D",
  BOS: "#007A33",
  BKN: "#000000",
  CHA: "#1D1160",
  CHI: "#CE1141",
  CLE: "#860038",
  DAL: "#00538C",
  DEN: "#0E2240",
  DET: "#C8102E",
  GSW: "#1D428A",
  HOU: "#CE1141",
  IND: "#002D62",
  LAC: "#C8102E",
  LAL: "#552583",
  MEM: "#5D76A9",
  MIA: "#98002E",
  MIL: "#00471B",
  MIN: "#0C2340",
  NOP: "#0C2340",
  NYK: "#006BB6",
  OKC: "#007AC1",
  ORL: "#0077C0",
  PHI: "#006BB6",
  PHX: "#1D1160",
  POR: "#E03A3E",
  SAC: "#5A2D81",
  SAS: "#C4CED4",
  TOR: "#CE1141",
  UTA: "#002B5C",
  WAS: "#002B5C",
};

export default function GameFeed({
  game,
  user,
  username,
  onBack,
  onViewProfile,
}) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moderatorIds, setModeratorIds] = useState(new Set());

  const homeAbbr = game.home;
  const awayAbbr = game.away;
  const homeScore = game.score?.[homeAbbr];
  const awayScore = game.score?.[awayAbbr];
  const isLive = game.status === "inprogress";
  const isScheduled = game.status === "scheduled";
  const isClosed = game.status === "closed";

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("game_takes")
      .select("*, profiles(avatar_url, is_shadowbanned)")
      .eq("game_id", game.id)
      .order("created_at", { ascending: false });
    setPosts(
      data?.filter(
        (p) => !p.profiles?.is_shadowbanned || p.user_id === user?.id,
      ) || [],
    );
  };

  const fetchModerators = async () => {
    const { data } = await supabase.from("moderators").select("user_id");
    setModeratorIds(new Set(data?.map((m) => m.user_id) || []));
  };

  useEffect(() => {
    const load = async () => {
      await fetchPosts();
      await fetchModerators();
    };
    load();

    const channel = supabase
      .channel(`game-feed-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_takes" },
        () => fetchPosts(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [game.id]);

  const postTake = async () => {
    if (!newPost.trim()) return;
    setLoading(true);
    setError("");

    try {
      const allowed = await moderateContent(newPost);
      if (!allowed) {
        setError("Your post contains inappropriate content.");
        setLoading(false);
        return;
      }
    } catch {
      // moderation failed, continue
    }

    await supabase.from("game_takes").insert({
      game_id: game.id,
      content: newPost,
      user_id: user.id,
      username,
    });

    setNewPost("");
    await fetchPosts();
    setLoading(false);
  };

  const deletePost = async (postId) => {
    await supabase.from("game_takes").delete().eq("id", postId);
    await fetchPosts();
  };

  const homeColor = NBA_TEAM_COLORS[homeAbbr] || "#f97316";
  const awayColor = NBA_TEAM_COLORS[awayAbbr] || "#888";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-white transition text-sm cursor-pointer"
          >
            ← Back
          </button>
        </div>

        {/* Scoreboard */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            background: "linear-gradient(135deg, #1c1c1e 0%, #2a2a2e 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            {isLive && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>
            )}
            {isScheduled && (
              <span className="text-zinc-400 text-xs">
                {new Date(game.start_time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            {isClosed && (
              <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                Final
              </span>
            )}
          </div>

          <div className="flex items-center justify-between px-6 pb-6">
            <div className="flex flex-col items-center gap-2 flex-1">
              <img
                src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/${awayAbbr.toLowerCase()}.png`}
                alt={awayAbbr}
                className="w-16 h-16"
                onError={(e) => (e.target.style.display = "none")}
              />
              <span className="text-zinc-300 text-sm font-medium">
                {game.teams[awayAbbr]?.name}
              </span>
              {!isScheduled && (
                <span
                  className="text-4xl font-black"
                  style={{ color: awayColor }}
                >
                  {awayScore}
                </span>
              )}
              {isScheduled && game.win_probability && (
                <span className="text-zinc-400 text-xs">
                  {game.win_probability[awayAbbr]}% win
                </span>
              )}
            </div>

            <div className="text-zinc-600 text-xl font-bold px-4">
              {isScheduled ? "vs" : "-"}
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              <img
                src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/${homeAbbr.toLowerCase()}.png`}
                alt={homeAbbr}
                className="w-16 h-16"
                onError={(e) => (e.target.style.display = "none")}
              />
              <span className="text-zinc-300 text-sm font-medium">
                {game.teams[homeAbbr]?.name}
              </span>
              {!isScheduled && (
                <span
                  className="text-4xl font-black"
                  style={{ color: homeColor }}
                >
                  {homeScore}
                </span>
              )}
              {isScheduled && game.win_probability && (
                <span className="text-zinc-400 text-xs">
                  {game.win_probability[homeAbbr]}% win
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Post box */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{
            background: "linear-gradient(135deg, #1c1c1e 0%, #2a2a2e 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Talk about this game... 🏀"
            className="w-full bg-transparent text-white placeholder-zinc-500 resize-none outline-none text-sm"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={postTake}
              disabled={loading || !newPost.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-full text-sm transition cursor-pointer"
            >
              {loading ? "Posting..." : "Post 🔥"}
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="text-zinc-500 text-center py-10">
              No posts yet. Be the first to talk about this game! 🏀
            </p>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, #1c1c1e 0%, #2a2a2e 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  onClick={() => onViewProfile(post.username)}
                  className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold overflow-hidden cursor-pointer"
                >
                  {post.profiles?.avatar_url ? (
                    <img
                      src={post.profiles.avatar_url}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    post.username?.[0]?.toUpperCase()
                  )}
                </div>
                <span
                  onClick={() => onViewProfile(post.username)}
                  className="text-zinc-400 text-sm cursor-pointer hover:text-white transition flex items-center gap-1"
                >
                  @{post.username}
                  {moderatorIds.has(post.user_id) && (
                    <span title="Moderator">🛡️</span>
                  )}
                </span>
                <span className="text-zinc-600 text-xs ml-auto">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
                {post.user_id === user?.id && (
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-zinc-600 hover:text-red-400 text-xs transition cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-white text-sm leading-relaxed">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
