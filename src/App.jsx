import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import UsernameSetup from "./pages/UsernameSetup";
import Profile from "./pages/Profile";

export default function App() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("feed");

  const fetchUsername = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();
    setUsername(data?.username || null);
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) await fetchUsername(session.user.id);
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchUsername(session.user.id);
      } else {
        setUsername(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
  if (page === "profile")
    return <Profile username={username} onBack={() => setPage("feed")} />;
  return <Feed username={username} onProfileClick={() => setPage("profile")} />;
}
