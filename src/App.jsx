import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import UsernameSetup from "./pages/UsernameSetup";
import Profile from "./pages/Profile";
import ViewProfile from "./pages/ViewProfile";
import GameFeed from "./pages/GameFeed";
import Messages from "./pages/Messages";
import TransactionsModal from "./pages/TransactionsModal";

export default function App() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("feed");
  const [viewingUsername, setViewingUsername] = useState(null);
  const [isModerator, setIsModerator] = useState(false);
  const [viewingGame, setViewingGame] = useState(null);
  const [userBucks, setUserBucks] = useState(0);
  const [activeConvo, setActiveConvo] = useState(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const rawHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  const fetchProfile = async (userId) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=username,nba_bucks&user_id=eq.${userId}&limit=1`,
        { headers: rawHeaders },
      );
      const data = await res.json();
      return data?.[0] || null;
    } catch {
      return null;
    }
  };

  const fetchModerator = async (userId) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/moderators?select=user_id&user_id=eq.${userId}&limit=1`,
        { headers: rawHeaders },
      );
      const data = await res.json();
      return data?.length > 0;
    } catch {
      return false;
    }
  };

  const fetchUnreadCount = async (userId) => {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("read", false);
    setUnreadCount(count || 0);
  };

  const settleUserBets = async (userId) => {
    try {
      const ABBR_MAP = {
        SA: "SAS",
        NO: "NOP",
        GS: "GSW",
        WSH: "WAS",
        NY: "NYK",
        UTAH: "UTA",
        GSD: "GSW",
      };

      // const normalizeTeam = (abbr) => ABBR_MAP[abbr] || abbr;
      const res = await fetch("/api/nba-scores");
      const data = await res.json();
      const finishedGames = (data.games || []).filter(
        (g) => g.status === "closed",
      );
      if (finishedGames.length === 0) return;

      const { data: pending } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .is("settled_at", null);

      if (!pending || pending.length === 0) return;

      let totalWinnings = 0;
      for (const pred of pending) {
        const game = finishedGames.find((g) => g.id === pred.game_id);
        console.log("Matching:", {
          pred_game_id: pred.game_id,
          pred_team: pred.team_picked,
          found_game: game ? `${game.home} vs ${game.away}` : "NO MATCH",
          game_id: game?.id,
        });
        if (!game) continue;

        const homeScore = game.score[game.home];
        const awayScore = game.score[game.away];
        const winner = homeScore > awayScore ? game.home : game.away;
        const won = winner === pred.team_picked;
        console.log("Winner check:", {
          winner,
          team_picked: pred.team_picked,
          won,
        });
        await supabase
          .from("predictions")
          .update({
            status: won ? "won" : "lost",
            settled_at: new Date().toISOString(),
          })
          .eq("id", pred.id);
        if (won) totalWinnings += pred.payout;
      }

      if (totalWinnings > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nba_bucks")
          .eq("user_id", userId)
          .single();
        const newBalance = (profile?.nba_bucks || 0) + totalWinnings;
        await supabase
          .from("profiles")
          .update({ nba_bucks: newBalance })
          .eq("user_id", userId);
        setUserBucks(newBalance);
      }
    } catch {
      /* continue */
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setSession(null);
          setUsername(null);
          setLoading(false);
          clearTimeout(timeout);
          return;
        }

        setSession(session);

        const profile = await fetchProfile(session.user.id);
        setUsername(profile?.username || null);
        setUserBucks(profile?.nba_bucks ?? 500);

        const isMod = await fetchModerator(session.user.id);
        setIsModerator(isMod);

        await fetchUnreadCount(session.user.id);
        await settleUserBets(session.user.id);

        // eslint-disable-next-line no-unused-vars
        const msgChannel = supabase
          .channel("unread-count")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "messages" },
            () => fetchUnreadCount(session.user.id),
          )
          .subscribe();
      } catch (err) {
        console.log("init error:", err);
      }

      clearTimeout(timeout);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const profile = await fetchProfile(session.user.id);
        setUsername(profile?.username || null);
        setUserBucks(profile?.nba_bucks ?? 500);
        const isMod = await fetchModerator(session.user.id);
        setIsModerator(isMod);
      } else {
        setUsername(null);
        setIsModerator(false);
        setUserBucks(0);
        setUnreadCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#080810" }}
      >
        <p className="text-orange-500 text-xl">🏀 Loading...</p>
      </div>
    );

  if (!session) return <Login />;
  if (!username)
    return <UsernameSetup user={session.user} onComplete={setUsername} />;

  return (
    <>
      {showTransactions && (
        <TransactionsModal
          userId={session.user.id}
          username={username}
          onClose={() => setShowTransactions(false)}
          onBucksUpdate={(newBalance) => setUserBucks(newBalance)}
        />
      )}

      {page === "profile" && (
        <Profile
          username={username}
          user={session.user}
          isModerator={isModerator}
          userBucks={userBucks}
          onBack={() => setPage("feed")}
          onProfileClick={() => setPage("profile")}
          onViewProfile={(u) => {
            setViewingUsername(u);
            setPage("viewProfile");
          }}
          onMessagesClick={() => {
            setUnreadCount(0);
            setPage("messages");
          }}
          onBucksClick={() => setShowTransactions(true)}
          unreadCount={unreadCount}
        />
      )}

      {page === "viewProfile" && (
        <ViewProfile
          username={viewingUsername}
          currentUser={session.user}
          currentUsername={username}
          currentUserBucks={userBucks}
          isModerator={isModerator}
          onBack={() => setPage("feed")}
          onProfileClick={() => setPage("profile")}
          onViewProfile={(u) => {
            setViewingUsername(u);
            setPage("viewProfile");
          }}
          onDM={(target) => {
            setActiveConvo(target);
            setPage("messages");
          }}
          onMessagesClick={() => {
            setUnreadCount(0);
            setPage("messages");
          }}
          unreadCount={unreadCount}
          onBucksClick={() => setShowTransactions(true)}
        />
      )}

      {page === "gameFeed" && (
        <GameFeed
          game={viewingGame}
          user={session.user}
          username={username}
          userBucks={userBucks}
          onBucksUpdate={setUserBucks}
          onProfileClick={() => setPage("profile")}
          onLogout={() => supabase.auth.signOut()}
          onBack={() => setPage("feed")}
          onViewProfile={(u) => {
            setViewingUsername(u);
            setPage("viewProfile");
          }}
          onMessagesClick={() => {
            setUnreadCount(0);
            setPage("messages");
          }}
          unreadCount={unreadCount}
          onBucksClick={() => setShowTransactions(true)}
        />
      )}

      {page === "messages" && (
        <Messages
          user={session.user}
          username={username}
          userBucks={userBucks}
          initialConvo={activeConvo}
          onProfileClick={() => setPage("profile")}
          onLogout={() => supabase.auth.signOut()}
          onMessagesClick={() => {
            setUnreadCount(0);
            setPage("messages");
          }}
          onViewProfile={(u) => {
            setViewingUsername(u);
            setPage("viewProfile");
          }}
          onBack={() => setPage("feed")}
          unreadCount={unreadCount}
          onBucksClick={() => setShowTransactions(true)}
        />
      )}

      {page === "feed" && (
        <Feed
          username={username}
          user={session.user}
          isModerator={isModerator}
          userBucks={userBucks}
          onBucksUpdate={setUserBucks}
          onProfileClick={() => setPage("profile")}
          onViewProfile={(u) => {
            setViewingUsername(u);
            setPage("viewProfile");
          }}
          onGameClick={(g) => {
            setViewingGame(g);
            setPage("gameFeed");
          }}
          onMessagesClick={() => {
            setUnreadCount(0);
            setPage("messages");
          }}
          unreadCount={unreadCount}
          onBucksClick={() => setShowTransactions(true)}
        />
      )}
    </>
  );
}
