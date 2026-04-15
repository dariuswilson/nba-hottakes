import { adminClient } from "./supabase.js";
import { normalizeTeam } from "./nbaTeams.js";

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

export async function fetchFinishedGameWinners() {
  const gamesRes = await fetch(SCOREBOARD_URL);
  const gamesData = await gamesRes.json();

  return (gamesData.events || [])
    .filter((e) => e.status?.type?.name === "STATUS_FINAL")
    .map((e) => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find((t) => t.homeAway === "home");
      const away = comp?.competitors?.find((t) => t.homeAway === "away");
      const homeScore = parseInt(home?.score, 10);
      const awayScore = parseInt(away?.score, 10);

      // Guard: skip if scores are missing or equal (both 0 means data not loaded;
      // equal non-zero scores are impossible in a finished NBA game).
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) {
        console.warn(
          `[settlement] Skipping game ${e.id}: suspicious scores ${homeScore}-${awayScore} — will retry on next run`,
        );
        return null;
      }

      const winner = homeScore > awayScore ? home?.team?.abbreviation : away?.team?.abbreviation;
      const normalizedWinner = normalizeTeam(String(winner || "").toUpperCase());

      console.log(
        `[settlement] Game ${e.id}: home ${home?.team?.abbreviation} ${homeScore} - ${awayScore} ${away?.team?.abbreviation} → winner: ${normalizedWinner}`,
      );

      return {
        game_id: String(e.id),
        winner: normalizedWinner,
      };
    })
    .filter((g) => g && g.game_id && g.winner);
}

export async function fetchFinishedWinnerForGame(gameId) {
  const target = String(gameId);
  const winners = await fetchFinishedGameWinners();
  return winners.find((g) => g.game_id === target) || null;
}

export async function runAtomicSettlement() {
  const finishedGames = await fetchFinishedGameWinners();
  if (finishedGames.length === 0) {
    return { settled: 0, credited_users: 0, scanned_games: 0 };
  }

  const { data, error } = await adminClient.rpc("settle_finished_games_atomic", {
    p_finished_games: finishedGames,
  });

  if (error) throw error;

  return {
    settled: data?.settled || 0,
    credited_users: data?.credited_users || 0,
    scanned_games: finishedGames.length,
  };
}

export async function runAtomicSettlementForGame(gameId) {
  const game = await fetchFinishedWinnerForGame(gameId);
  if (!game) {
    return { settled: 0, credited_users: 0, scanned_games: 0 };
  }

  const { data, error } = await adminClient.rpc("settle_finished_games_atomic", {
    p_finished_games: [game],
  });

  if (error) throw error;

  return {
    settled: data?.settled || 0,
    credited_users: data?.credited_users || 0,
    scanned_games: 1,
  };
}
