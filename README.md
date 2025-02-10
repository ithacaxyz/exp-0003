# EXP-0003: App Sessions feat. Permissions

![Cover](./.github/cover.png)

[Read the Blog Post](https://www.ithaca.xyz/writings/exp-0003)

## Overview

### Keywords

- Client: The frontend application running in the browser,
- Server: The Cloudflare Worker that handles key generation, preparing and sending calls, scheduling and managing CRON jobs.

## Getting Started


```shell
# install / update pnpm
npm install --global pnpm@latest

# install dependencies 
pnpm install

# start worker and client dev
pnpm --filter='server' --filter='client' dev

# build both
pnpm --filter='server' --filter='client' build
```

If you want to deploy the worker or the client or both, check the next sections.

## Deploying

### Prerequisites

- A Cloudflare account
- `wrangler` CLI: `pnpm add --global wrangler@latest`,
- `wrangler login`

```shell
# deploy client
cd client
pnpm build

wrangler deploy dist --config='wrangler.toml'

# deploy worker
cd server
pnpm build

wrangler deploy dist --config='wrangler.toml'
```
