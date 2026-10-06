import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  // Ensure this is only accessible in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'test@example.com'; // Default or provided test email

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw userError;

    // Find first user if email not specified, or find matching
    const user = searchParams.has('email')
      ? users.find(u => u.email === email)
      : users[0];

    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    // Generate a magic link for this user
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (error) throw error;

    // We can redirect the user to the generated link which will set the session cookies
    // Or we can manually set the session. Using the generated link is easier and more robust.
    // However, since we are returning a response, we can redirect to the callback or directly to the magic link url

    // In our case, the easiest is to just redirect to the magic link URL
    return NextResponse.redirect(new URL(data.properties.action_link, request.url));
  } catch (error: any) {
    console.error('Dev login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
