import { useState } from "react";
import { supabase } from "../supabase";
import { containsBlockedTerm } from "../utils/blocklist";
import { moderateContent } from "../utils/moderate";

export default function UsernameSetup({ user, onComplete }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!username.trim()) return;
    if (username.length < 3)
      return setError("Username must be at least 3 characters");
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return setError("Only letters, numbers, and underscores");
    if (containsBlockedTerm(username)) {
      return setError("That username is not allowed. Please choose another.");
    }
    const allowed = await moderateContent(username);
    if (!allowed)
      return setError("That username is not allowed. Please choose another.");

    setLoading(true);
    setError("");

    // Check if username is taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single();

    if (existing) {
      setError("Username is already taken!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      user_id: user.id,
      username,
    });

    if (error) setError(error.message);
    else onComplete(username);

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-orange-500 mb-2">
          🏀 One last step
        </h1>
        <p className="text-zinc-400 mb-6">Choose your username</p>

        <div className="flex items-center bg-zinc-800 rounded-lg px-3 mb-4">
          <span className="text-zinc-500">@</span>
          <input
            type="text"
            placeholder="yourname"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="flex-1 bg-transparent text-white p-3 outline-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !username.trim()}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? "Saving..." : "Let's Go 🔥"}
        </button>
      </div>
    </div>
  );
}
