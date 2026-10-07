# durante/02 — Hello world running locally

**Intent:** run web + API against the real Supabase project.
**Outcome:** env files set by me (secrets never in chat); Data API closed
to `public` (verified with a probe). The AI found that Supabase's built-in
email only reaches team members, which would block reviewers; email
confirmation turned off and a demo account created through the real
sign-up flow. `GET /me` verified a real ES256 token and read the profile
through RLS.

## Prompts

> Where do I do 3rd step?

> Done

> Is there an account ready to test?

> Done, changed the config
