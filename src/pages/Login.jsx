import { useState } from "react";
import { supabase } from "../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setError("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-orange-500 mb-2">
          🏀 NBA Hot Takes
        </h1>
        <p className="text-zinc-400 mb-6">
          {isSignUp ? "Create an account" : "Welcome back"}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-800 text-white p-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-orange-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-800 text-white p-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-orange-500"
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
        </button>

        <p className="text-zinc-400 text-sm text-center mt-4">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-orange-500 cursor-pointer hover:underline"
          >
            {isSignUp ? "Login" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}
