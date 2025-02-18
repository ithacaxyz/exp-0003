#!/usr/bin/env bash

set -eou pipefail

sqlite_path=$(/usr/bin/find .wrangler/state/v3/d1/miniflare-D1DatabaseObject -type f -name "*.sqlite" -print -quit)

pnpm dlx @outerbase/studio "$sqlite_path"
