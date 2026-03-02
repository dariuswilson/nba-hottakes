import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import UsernameSetup from "./pages/UsernameSetup";

export default function App() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsername = async (userId) => {
    console.log("fetching username for", userId);
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();
    console.log("profile result", data, error);
    setUsername(data?.username || null);
  };

  useEffect(() => {
    const loadSession = async () => {
      console.log("loading session...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      console.log("session result", session, error);
      setSession(session);
      if (session) await fetchUsername(session.user.id);
      console.log("setting loading false");
      setLoading(false);
    };

    loadSession();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-orange-500 text-xl">🏀 Loading...</p>
      </div>
    );

  if (!session) return <Login />;
  if (!username)
    return <UsernameSetup user={session.user} onComplete={setUsername} />;
  return <Feed username={username} />;
}
