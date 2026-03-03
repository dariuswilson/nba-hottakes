import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { moderateContent } from "../utils/moderate";

const EMOJIS = ["🔥", "💀", "🐐", "😂", "👀"];

export default function Feed({ username, user, onProfileClick }) {
  const [takes, setTakes] = useState([]);
  const [newTake, setNewTake] = useState("");
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [openComments, setOpenComments] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");

  const fetchTakes = async () => {
    const { data, error } = await supabase
      .from("takes")
      .select("*, profiles(avatar_url)")
      .order("created_at", { ascending: false });
    console.log("takes:", data, "error:", error);
    setTakes(data || []);
  };

  const fetchReactions = async () => {
    const { data } = await supabase.from("reactions").select("*");
    const grouped = {};
    data?.forEach((r) => {
      if (!grouped[r.take_id]) grouped[r.take_id] = {};
      if (!grouped[r.take_id][r.emoji]) grouped[r.take_id][r.emoji] = [];
      grouped[r.take_id][r.emoji].push(r.user_id);
    });
    setReactions(grouped);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(avatar_url)")
      .order("created_at", { ascending: true });
    const grouped = {};
    data?.forEach((c) => {
      if (!grouped[c.take_id]) grouped[c.take_id] = [];
      grouped[c.take_id].push(c);
    });
    setComments(grouped);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchTakes();
      await fetchReactions();
      await fetchComments();
    };
    loadData();

    const channel = supabase
      .channel("realtime-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "takes" },
        () => fetchTakes(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => fetchReactions(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => fetchComments(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []); // Comment

  const postTake = async () => {
    if (!newTake.trim()) return;
    setLoading(true);
    const allowed = await moderateContent(newTake);
    if (!allowed) {
      setError("Your take contains inappropriate content. Please revise it.");
      setLoading(false);
      return;
    }
    await supabase.from("takes").insert({
      content: newTake,
      user_id: user.id,
      username: username,
    });
    setNewTake("");
    await fetchTakes();
    setLoading(false);
  };

  const handleReaction = async (takeId, emoji) => {
    const existing = reactions[takeId]?.[emoji]?.includes(user.id);
    if (existing) {
      await supabase
        .from("reactions")
        .delete()
        .eq("take_id", takeId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("reactions").insert({
        take_id: takeId,
        user_id: user.id,
        emoji,
      });
    }
    await fetchReactions();
  };

  const deleteComment = async (commentId) => {
    await supabase.from("comments").delete().eq("id", commentId);
    await fetchComments();
  };

  const deleteTake = async (takeId) => {
    await supabase.from("takes").delete().eq("id", takeId);
    await fetchTakes();
  };

  const postComment = async (takeId) => {
    if (!newComment.trim()) return;

    const allowed = await moderateContent(newComment);
    if (!allowed) {
      setError("Your comment contains inappropriate content.");
      return;
    }
    await supabase.from("comments").insert({
      take_id: takeId,
      user_id: user.id,
      username: username,
      content: newComment,
    });
    setNewComment("");
    await fetchComments();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-orange-500">
            🏀 NBA Hot Takes
          </h1>
          <button
            onClick={onProfileClick}
            className="text-zinc-400 hover:text-white text-sm transition"
          >
            👤 Profile
          </button>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-4 mb-6">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <textarea
            value={newTake}
            onChange={(e) => setNewTake(e.target.value)}
            placeholder="Drop your NBA hot take... 🔥"
            className="w-full bg-transparent text-white placeholder-zinc-500 resize-none outline-none text-sm"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={postTake}
              disabled={loading || !newTake.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-full text-sm transition"
            >
              {loading ? "Posting..." : "Post Take 🔥"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {takes.length === 0 && (
            <p className="text-zinc-500 text-center py-10">
              No takes yet. Be the first! 🏀
            </p>
          )}
          {takes.map((take) => (
            <div key={take.id} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                  {take.profiles?.avatar_url ? (
                    <img
                      src={take.profiles.avatar_url}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    take.username?.[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-zinc-400 text-sm">@{take.username}</span>
                <span className="text-zinc-600 text-xs ml-auto">
                  {new Date(take.created_at).toLocaleDateString()}
                </span>
                {take.user_id === user?.id && (
                  <button
                    onClick={() => deleteTake(take.id)}
                    className="text-zinc-600 hover:text-red-400 text-xs transition"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-white mb-3">{take.content}</p>

              {/* Reactions */}
              <div className="flex gap-2 flex-wrap mb-3">
                {EMOJIS.map((emoji) => {
                  const count = reactions[take.id]?.[emoji]?.length || 0;
                  const reacted = reactions[take.id]?.[emoji]?.includes(
                    user?.id,
                  );
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(take.id, emoji)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                        reacted
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {emoji} {count > 0 && <span>{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Comments toggle */}
              <button
                onClick={() =>
                  setOpenComments(openComments === take.id ? null : take.id)
                }
                className="text-zinc-500 text-xs hover:text-zinc-300 transition"
              >
                💬 {comments[take.id]?.length || 0} comments
              </button>

              {/* Comments section */}
              {openComments === take.id && (
                <div className="mt-3 border-t border-zinc-800 pt-3 space-y-3">
                  {comments[take.id]?.map((c) => (
                    <div key={c.id} className="flex gap-2 items-start">
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                        {c.profiles?.avatar_url ? (
                          <img
                            src={c.profiles.avatar_url}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.username?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-zinc-400 text-xs">
                          @{c.username}{" "}
                        </span>
                        <span className="text-white text-sm">{c.content}</span>
                      </div>
                      {c.user_id === user?.id && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-zinc-600 hover:text-red-400 text-xs transition"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && postComment(take.id)
                      }
                      placeholder="Add a comment..."
                      className="flex-1 bg-zinc-800 text-white text-sm px-3 py-2 rounded-full outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => postComment(take.id)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-full transition"
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
