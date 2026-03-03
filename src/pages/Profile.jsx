import { useState, useEffect } from "react";
import { supabase } from "../supabase";

const NBA_TEAMS = [
  { name: "Atlanta Hawks", abbr: "ATL" },
  { name: "Boston Celtics", abbr: "BOS" },
  { name: "Brooklyn Nets", abbr: "BKN" },
  { name: "Charlotte Hornets", abbr: "CHA" },
  { name: "Chicago Bulls", abbr: "CHI" },
  { name: "Cleveland Cavaliers", abbr: "CLE" },
  { name: "Dallas Mavericks", abbr: "DAL" },
  { name: "Denver Nuggets", abbr: "DEN" },
  { name: "Detroit Pistons", abbr: "DET" },
  { name: "Golden State Warriors", abbr: "GSW" },
  { name: "Houston Rockets", abbr: "HOU" },
  { name: "Indiana Pacers", abbr: "IND" },
  { name: "LA Clippers", abbr: "LAC" },
  { name: "Los Angeles Lakers", abbr: "LAL" },
  { name: "Memphis Grizzlies", abbr: "MEM" },
  { name: "Miami Heat", abbr: "MIA" },
  { name: "Milwaukee Bucks", abbr: "MIL" },
  { name: "Minnesota Timberwolves", abbr: "MIN" },
  { name: "New Orleans Pelicans", abbr: "NOP" },
  { name: "New York Knicks", abbr: "NYK" },
  { name: "Oklahoma City Thunder", abbr: "OKC" },
  { name: "Orlando Magic", abbr: "ORL" },
  { name: "Philadelphia 76ers", abbr: "PHI" },
  { name: "Phoenix Suns", abbr: "PHX" },
  { name: "Portland Trail Blazers", abbr: "POR" },
  { name: "Sacramento Kings", abbr: "SAC" },
  { name: "San Antonio Spurs", abbr: "SAS" },
  { name: "Toronto Raptors", abbr: "TOR" },
  { name: "Utah Jazz", abbr: "UTA" },
  { name: "Washington Wizards", abbr: "WAS" },
];

export default function Profile({ username, user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [takes, setTakes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [badges, setBadges] = useState([]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setProfile(profileData);
    setBio(profileData?.bio || "");
    setFavoriteTeam(profileData?.favorite_team || "");

    const { data: badgeData } = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", user.id);

    setBadges(badgeData || []);
  };

  const fetchTakes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("takes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTakes(data || []);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchProfile();
      await fetchTakes();
    };
    loadData();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("user_id", user.id);
      fetchProfile();
    }

    setUploading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ bio, favorite_team: favoriteTeam })
      .eq("user_id", user.id);
    await fetchProfile();
    setEditing(false);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="text-zinc-400 hover:text-white transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-orange-500">🏀 My Profile</h1>
        </div>

        {/* Profile card */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-bold overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  username?.[0]?.toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-zinc-700 hover:bg-zinc-600 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer transition">
                <span className="text-xs">✎</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-xl font-bold">@{username}</h2>
              {profile?.favorite_team && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/${profile.favorite_team.toLowerCase()}.png`}
                    alt={profile.favorite_team}
                    className="w-6 h-6"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <span className="text-zinc-400 text-sm">
                    {
                      NBA_TEAMS.find((t) => t.abbr === profile.favorite_team)
                        ?.name
                    }
                  </span>
                </div>
              )}
              {!editing && (
                <p className="text-zinc-400 text-sm mt-2">
                  {profile?.bio || "No bio yet"}
                </p>
              )}
            </div>

            <button
              onClick={() => setEditing(!editing)}
              className="text-zinc-400 hover:text-white text-sm transition"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-4 space-y-3">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a bio..."
                rows={3}
                className="w-full bg-zinc-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
              />
              <select
                value={favoriteTeam}
                onChange={(e) => setFavoriteTeam(e.target.value)}
                className="w-full bg-zinc-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="">Select your favorite team</option>
                {NBA_TEAMS.map((team) => (
                  <option key={team.abbr} value={team.abbr}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-2 rounded-lg transition"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}

          {uploading && (
            <p className="text-zinc-400 text-sm mt-2">Uploading picture...</p>
          )}
        </div>

        {/* User's takes */}
        <h3 className="text-lg font-bold mb-4">My Takes</h3>
        <div className="space-y-4">
          {takes.length === 0 && (
            <p className="text-zinc-500 text-center py-6">No takes yet!</p>
          )}
          {takes.map((take) => (
            <div key={take.id} className="bg-zinc-900 rounded-2xl p-4">
              <p className="text-white">{take.content}</p>
              <p className="text-zinc-600 text-xs mt-2">
                {new Date(take.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">🏅 Badges</h3>
          {badges.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No badges yet — keep being active!
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 rounded-full"
                >
                  <span className="text-lg">🏆</span>
                  <span className="text-black font-bold text-sm">
                    {badge.badge_key === "first_100"
                      ? "First 100"
                      : badge.badge_key}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
