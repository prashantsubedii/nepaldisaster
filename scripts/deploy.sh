#!/usr/bin/env bash
# Deploy the current checkout to Vercel production with the project owner's token.
#
# Why not git deploys or a deploy hook: on Vercel's Hobby plan both are blocked
# unless the latest commit's author owns the Vercel project, and our commits come
# from collaborators and the hourly bot. A CLI upload made with the owner's token
# is not tied to a commit author. We deploy from a copy without .git so no commit
# author metadata is attached.
#
# Needs repo secrets: VERCEL_TOKEN, VERCEL_ORG_ID (team ID), VERCEL_PROJECT_ID.
set -euo pipefail

if [ -z "${VERCEL_TOKEN:-}" ] || [ -z "${VERCEL_ORG_ID:-}" ] || [ -z "${VERCEL_PROJECT_ID:-}" ]; then
  echo "::warning::VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID not set; skipping deploy."
  exit 0
fi

out="$(mktemp -d)"
tar --exclude=.git -cf - . | tar -xf - -C "$out"
cd "$out"
url="$(npx --yes vercel@65.14.0 deploy --prod --yes --token "$VERCEL_TOKEN")"
echo "Deployed: $url"
