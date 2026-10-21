import { createClient } from "@/lib/supabase/client";

// Services use the same cookie-backed browser client as login and middleware.
export const supabase = createClient();
