#!/usr/bin/env bash

set -eou pipefail

# in case of multiple sqlite files, use the latest (most recent) one
sqlite_path=$(/usr/bin/find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -type f -name "*.sqlite" -print | tail -n 1)

pnpm dlx @outerbase/studio "$sqlite_path"
