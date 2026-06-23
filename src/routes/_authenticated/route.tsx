import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserProfile } from "@/lib/auth-profile";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const profileEnsuredKey = `solvix_profile_ensured_${data.user.id}`;
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(profileEnsuredKey) !== "true"
    ) {
      try {
        await ensureUserProfile(data.user);
        window.sessionStorage.setItem(profileEnsuredKey, "true");
      } catch (profileError) {
        console.warn("[Auth] Profile could not be ensured.", profileError);
      }
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
