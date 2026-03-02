import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xtpbzwtzxrcraszxgyjx.supabase.co"; // from General settings
const supabaseKey = "sb_publishable_3HNzfbfGXQt2Ru8EGuv82Q_WyBTsbpV"; // the publishable key

export const supabase = createClient(supabaseUrl, supabaseKey);
