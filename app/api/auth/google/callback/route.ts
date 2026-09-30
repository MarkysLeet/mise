import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (error) {
    return NextResponse.redirect(`${origin}/onboarding?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/onboarding?error=No code provided`);
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(`${origin}/onboarding?error=Kullanıcı oturumu bulunamadı`);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, workspaces(*)")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.workspaces) {
      return NextResponse.redirect(`${origin}/onboarding?error=Çalışma alanı bulunamadı`);
    }

    const workspace = profile.workspaces;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
       return NextResponse.redirect(`${origin}/onboarding?error=Refresh token alınamadı. Lütfen izinleri kontrol edin.`);
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Create a root folder for the workspace on the user's Drive
    const folderName = `Mise - ${workspace.name}`;

    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id",
      supportsAllDrives: true,
    });

    const folderId = folder.data.id;
    if (!folderId) {
       return NextResponse.redirect(`${origin}/onboarding?error=Klasör oluşturulamadı`);
    }

    // Update database with the refresh token and new folder ID
    // We use the admin client since RLS might not let us update the workspace directly or it's just safer
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .update({
        google_refresh_token: tokens.refresh_token,
        drive_folder_id: folderId,
        // is_onboarded remains false until sync is complete
      })
      .eq("id", workspace.id);

    if (workspaceError) {
      console.error("Failed to update workspace:", workspaceError);
      return NextResponse.redirect(`${origin}/onboarding?error=Veritabanı güncellenemedi`);
    }

    // Redirect back to onboarding with sync=true
    return NextResponse.redirect(`${origin}/onboarding?sync=true`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${origin}/onboarding?error=Yetkilendirme sırasında bir hata oluştu`);
  }
}
