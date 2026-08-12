# CI DB failure (2026-08-12T14:06:08Z)

sha: dca1701e37fe7942d2efa5d5dc082ab488b35f32
run: https://github.com/ismaileniz01-hub/kaify/actions/runs/31604711530

Client: Docker Engine - Community
 Version:           28.0.4
 API version:       1.48
 Go version:        go1.23.7
 Git commit:        b8034c0
 Built:             Tue Mar 25 15:07:16 2025
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          28.0.4
  API version:      1.48 (minimum version 1.24)
  Go version:       go1.23.7
  Git commit:       6430e49
  Built:            Tue Mar 25 15:07:16 2025
  OS/Arch:          linux/amd64
  Experimental:     false
 containerd:
  Version:          v2.2.6
  GitCommit:        11ce9d5f3c68c941867e82890e93e815c1304f1b
 runc:
  Version:          1.3.6
  GitCommit:        v1.3.6-0-g491b69ba
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0

## supabase-db-start.log
```
NotFound: FileSystem.readFile (/home/runner/.supabase/profile)
WARN: config section [inbucket] is deprecated. Please use [local_smtp] instead.
Starting database...
15.8.1.085: Pulling from supabase/postgres
13b7e930469f: Pulling fs layer
fff1a581b40e: Pulling fs layer
b87ddba4145f: Pulling fs layer
14c7c40f264e: Pulling fs layer
7e1afeac9515: Pulling fs layer
7dd51689e5de: Pulling fs layer
4f4fb700ef54: Pulling fs layer
daa7c753cf32: Pulling fs layer
c61d94d80b8d: Pulling fs layer
73d5273f17e0: Pulling fs layer
5d4d12d40ee2: Pulling fs layer
bec4cd2d8288: Pulling fs layer
95553dc9aee4: Pulling fs layer
cef3e4219e2d: Pulling fs layer
83a5975346e8: Pulling fs layer
848b1c5912e5: Pulling fs layer
f2c897740b67: Pulling fs layer
0f819c04149e: Pulling fs layer
4e5b5a409361: Pulling fs layer
addf9dc09fca: Pulling fs layer
1e3ae6415742: Pulling fs layer
2d3eb0cf3634: Pulling fs layer
cb6a11cda9f8: Pulling fs layer
5904fe0a8541: Pulling fs layer
484e22708485: Pulling fs layer
5bd4dd8b80e3: Pulling fs layer
a00ab32c0cad: Pulling fs layer
7df60113bd5f: Pulling fs layer
7dd51689e5de: Waiting
1f87a4556ee4: Pulling fs layer
586e7e55dc38: Pulling fs layer
4f4fb700ef54: Waiting
58c2f4245eec: Pulling fs layer
daa7c753cf32: Waiting
826b8d755762: Pulling fs layer
18e11daf70d2: Pulling fs layer
9ace01da70a3: Pulling fs layer
1f04457496a9: Pulling fs layer
2a75afedac1e: Pulling fs layer
f54c636bbcd3: Pulling fs layer
ab6d1e52f2bb: Pulling fs layer
e12ac39a69ef: Pulling fs layer
04364d336696: Pulling fs layer
e68f98342a0d: Pulling fs layer
669f792103a4: Pulling fs layer
f80d99bfabdb: Pulling fs layer
d0ebd75bb4ef: Pulling fs layer
a1028bd6f848: Pulling fs layer
14c7c40f264e: Waiting
44bd6c2c1e25: Pulling fs layer
7e1afeac9515: Waiting
bec4cd2d8288: Waiting
95553dc9aee4: Waiting
cef3e4219e2d: Waiting
586e7e55dc38: Waiting
83a5975346e8: Waiting
58c2f4245eec: Waiting
848b1c5912e5: Waiting
826b8d755762: Waiting
f2c897740b67: Waiting
18e11daf70d2: Waiting
0f819c04149e: Waiting
9ace01da70a3: Waiting
4e5b5a409361: Waiting
1f04457496a9: Waiting
addf9dc09fca: Waiting
2a75afedac1e: Waiting
1e3ae6415742: Waiting
f54c636bbcd3: Waiting
2d3eb0cf3634: Waiting
cb6a11cda9f8: Waiting
5904fe0a8541: Waiting
ab6d1e52f2bb: Waiting
484e22708485: Waiting
e12ac39a69ef: Waiting
04364d336696: Waiting
5bd4dd8b80e3: Waiting
c61d94d80b8d: Waiting
73d5273f17e0: Waiting
5d4d12d40ee2: Waiting
e68f98342a0d: Waiting
669f792103a4: Waiting
f80d99bfabdb: Waiting
d0ebd75bb4ef: Waiting
a1028bd6f848: Waiting
44bd6c2c1e25: Waiting
7df60113bd5f: Waiting
1f87a4556ee4: Waiting
a00ab32c0cad: Waiting
b87ddba4145f: Verifying Checksum
b87ddba4145f: Download complete
13b7e930469f: Verifying Checksum
13b7e930469f: Download complete
14c7c40f264e: Verifying Checksum
14c7c40f264e: Download complete
fff1a581b40e: Verifying Checksum
fff1a581b40e: Download complete
4f4fb700ef54: Verifying Checksum
4f4fb700ef54: Download complete
7dd51689e5de: Verifying Checksum
7dd51689e5de: Download complete
7e1afeac9515: Download complete
73d5273f17e0: Verifying Checksum
73d5273f17e0: Download complete
c61d94d80b8d: Download complete
bec4cd2d8288: Verifying Checksum
bec4cd2d8288: Download complete
5d4d12d40ee2: Verifying Checksum
5d4d12d40ee2: Download complete
cef3e4219e2d: Verifying Checksum
cef3e4219e2d: Download complete
95553dc9aee4: Verifying Checksum
95553dc9aee4: Download complete
83a5975346e8: Verifying Checksum
83a5975346e8: Download complete
848b1c5912e5: Download complete
f2c897740b67: Verifying Checksum
f2c897740b67: Download complete
13b7e930469f: Pull complete
0f819c04149e: Verifying Checksum
0f819c04149e: Download complete
4e5b5a409361: Verifying Checksum
4e5b5a409361: Download complete
addf9dc09fca: Verifying Checksum
addf9dc09fca: Download complete
2d3eb0cf3634: Download complete
daa7c753cf32: Verifying Checksum
daa7c753cf32: Download complete
5904fe0a8541: Verifying Checksum
5904fe0a8541: Download complete
1e3ae6415742: Verifying Checksum
1e3ae6415742: Download complete
484e22708485: Verifying Checksum
484e22708485: Download complete
5bd4dd8b80e3: Verifying Checksum
5bd4dd8b80e3: Download complete
cb6a11cda9f8: Download complete
7df60113bd5f: Verifying Checksum
7df60113bd5f: Download complete
1f87a4556ee4: Verifying Checksum
1f87a4556ee4: Download complete
586e7e55dc38: Download complete
58c2f4245eec: Verifying Checksum
58c2f4245eec: Download complete
a00ab32c0cad: Verifying Checksum
a00ab32c0cad: Download complete
826b8d755762: Download complete
9ace01da70a3: Verifying Checksum
9ace01da70a3: Download complete
18e11daf70d2: Verifying Checksum
18e11daf70d2: Download complete
1f04457496a9: Verifying Checksum
1f04457496a9: Download complete
2a75afedac1e: Verifying Checksum
2a75afedac1e: Download complete
f54c636bbcd3: Verifying Checksum
f54c636bbcd3: Download complete
ab6d1e52f2bb: Verifying Checksum
ab6d1e52f2bb: Download complete
e12ac39a69ef: Download complete
04364d336696: Verifying Checksum
04364d336696: Download complete
f80d99bfabdb: Verifying Checksum
f80d99bfabdb: Download complete
e68f98342a0d: Download complete
669f792103a4: Verifying Checksum
669f792103a4: Download complete
44bd6c2c1e25: Verifying Checksum
44bd6c2c1e25: Download complete
a1028bd6f848: Verifying Checksum
a1028bd6f848: Download complete
d0ebd75bb4ef: Verifying Checksum
d0ebd75bb4ef: Download complete
fff1a581b40e: Pull complete
b87ddba4145f: Pull complete
14c7c40f264e: Pull complete
7e1afeac9515: Pull complete
7dd51689e5de: Pull complete
4f4fb700ef54: Pull complete
daa7c753cf32: Pull complete
c61d94d80b8d: Pull complete
73d5273f17e0: Pull complete
5d4d12d40ee2: Pull complete
bec4cd2d8288: Pull complete
95553dc9aee4: Pull complete
cef3e4219e2d: Pull complete
83a5975346e8: Pull complete
848b1c5912e5: Pull complete
f2c897740b67: Pull complete
0f819c04149e: Pull complete
4e5b5a409361: Pull complete
addf9dc09fca: Pull complete
1e3ae6415742: Pull complete
2d3eb0cf3634: Pull complete
cb6a11cda9f8: Pull complete
5904fe0a8541: Pull complete
484e22708485: Pull complete
5bd4dd8b80e3: Pull complete
a00ab32c0cad: Pull complete
7df60113bd5f: Pull complete
1f87a4556ee4: Pull complete
586e7e55dc38: Pull complete
58c2f4245eec: Pull complete
826b8d755762: Pull complete
18e11daf70d2: Pull complete
9ace01da70a3: Pull complete
1f04457496a9: Pull complete
2a75afedac1e: Pull complete
f54c636bbcd3: Pull complete
ab6d1e52f2bb: Pull complete
e12ac39a69ef: Pull complete
04364d336696: Pull complete
e68f98342a0d: Pull complete
669f792103a4: Pull complete
f80d99bfabdb: Pull complete
d0ebd75bb4ef: Pull complete
a1028bd6f848: Pull complete
44bd6c2c1e25: Pull complete
Digest: sha256:af083ef64d0408c8f098ee6f5c364a59b26f36fbc0f3a334a62c5c1d57362e9b
Status: Downloaded newer image for ghcr.io/supabase/postgres:15.8.1.085
ghcr.io/supabase/postgres:15.8.1.085
Initialising schema...
v1.68.10: Pulling from supabase/storage-api
e6f31ffc071e: Pulling fs layer
5f05fbb94ac9: Pulling fs layer
dbd229483e61: Pulling fs layer
f4e2bfbd8bcd: Pulling fs layer
521c5280947c: Pulling fs layer
3f609ae12598: Pulling fs layer
35d5e54f513a: Pulling fs layer
25e9c8801257: Pulling fs layer
331c4f30549c: Pulling fs layer
294ed970ec07: Pulling fs layer
0cd3238360a9: Pulling fs layer
601df250e23a: Pulling fs layer
e1511382296b: Pulling fs layer
ebf0f77af059: Pulling fs layer
25e9c8801257: Waiting
331c4f30549c: Waiting
294ed970ec07: Waiting
0cd3238360a9: Waiting
601df250e23a: Waiting
e1511382296b: Waiting
ebf0f77af059: Waiting
521c5280947c: Waiting
3f609ae12598: Waiting
35d5e54f513a: Waiting
f4e2bfbd8bcd: Waiting
dbd229483e61: Verifying Checksum
dbd229483e61: Download complete
e6f31ffc071e: Verifying Checksum
e6f31ffc071e: Download complete
f4e2bfbd8bcd: Verifying Checksum
f4e2bfbd8bcd: Download complete
e6f31ffc071e: Pull complete
5f05fbb94ac9: Verifying Checksum
5f05fbb94ac9: Download complete
3f609ae12598: Verifying Checksum
3f609ae12598: Download complete
35d5e54f513a: Download complete
25e9c8801257: Verifying Checksum
25e9c8801257: Download complete
294ed970ec07: Download complete
521c5280947c: Verifying Checksum
521c5280947c: Download complete
331c4f30549c: Verifying Checksum
331c4f30549c: Download complete
601df250e23a: Verifying Checksum
601df250e23a: Download complete
e1511382296b: Verifying Checksum
e1511382296b: Download complete
0cd3238360a9: Verifying Checksum
0cd3238360a9: Download complete
ebf0f77af059: Verifying Checksum
ebf0f77af059: Download complete
5f05fbb94ac9: Pull complete
dbd229483e61: Pull complete
f4e2bfbd8bcd: Pull complete
521c5280947c: Pull complete
3f609ae12598: Pull complete
35d5e54f513a: Pull complete
25e9c8801257: Pull complete
331c4f30549c: Pull complete
294ed970ec07: Pull complete
0cd3238360a9: Pull complete
601df250e23a: Pull complete
e1511382296b: Pull complete
ebf0f77af059: Pull complete
Digest: sha256:2036b42317d417a6f8a805f168b3fe137a14bd3745028189fa311f7f222f867d
Status: Downloaded newer image for ghcr.io/supabase/storage-api:v1.68.10
ghcr.io/supabase/storage-api:v1.68.10
v2.195.0: Pulling from supabase/gotrue
55afa1ecc21d: Already exists
565df2d910df: Pulling fs layer
dc286a8aa197: Pulling fs layer
3b1d86731cf1: Pulling fs layer
fd855b1da301: Pulling fs layer
ad8aa6f5f9a9: Pulling fs layer
fd855b1da301: Waiting
ad8aa6f5f9a9: Waiting
dc286a8aa197: Verifying Checksum
dc286a8aa197: Download complete
565df2d910df: Download complete
565df2d910df: Pull complete
3b1d86731cf1: Verifying Checksum
3b1d86731cf1: Download complete
fd855b1da301: Verifying Checksum
fd855b1da301: Download complete
dc286a8aa197: Pull complete
ad8aa6f5f9a9: Verifying Checksum
ad8aa6f5f9a9: Download complete
3b1d86731cf1: Pull complete
fd855b1da301: Pull complete
ad8aa6f5f9a9: Pull complete
Digest: sha256:362659ca70eaa75ba05bbaf963caa84c1c5afe5e8fbf0777e17b830dd5f0f60a
Status: Downloaded newer image for ghcr.io/supabase/gotrue:v2.195.0
ghcr.io/supabase/gotrue:v2.195.0
Seeding globals from roles.sql...
Applying migration 20260630120000_init_core.sql...
Applying migration 20260630130000_onboarding_rpcs.sql...
Applying migration 20260630140000_gamification_core.sql...
Applying migration 20260630150000_usage_limits.sql...
Applying migration 20260630160000_chat_ai_schema.sql...
Applying migration 20260630170000_phase6_memory_admin_referral.sql...
Applying migration 20260630180000_leaderboard.sql...
Applying migration 20260630190000_phase8_analytics_market_team.sql...
Applying migration 20260702120000_backend_hardening.sql...
Applying migration 20260702140000_team_chat_backfill.sql...
Applying migration 20260702160000_security_quota_refund.sql...
Applying migration 20260702170000_profile_timezone.sql...
Applying migration 20260702180000_idempotency_and_audit.sql...
Applying migration 20260702190000_notifications.sql...
Applying migration 20260702200000_push_subscriptions.sql...
Applying migration 20260702210000_native_push_tokens.sql...
Applying migration 20260702220000_security_hardening.sql...
Applying migration 20260702230000_perf_rls_indexes.sql...
Applying migration 20260703090000_referral_abuse_guard.sql...
Applying migration 20260703091000_inbox_previews_rpc.sql...
Applying migration 20260703120000_ai_cost_observability.sql...
Applying migration 20260703140000_schema_bridge_profiles.sql...
Applying migration 20260703230000_gems_backfill_and_country_lb.sql...
Applying migration 20260704120000_security_hardening.sql...
Applying migration 20260704140000_daily_chest.sql...
Applying migration 20260704150000_earn_gems_schema_drift.sql...
Applying migration 20260704160000_market_purchase_enum.sql...
Applying migration 20260704170000_active_aura_persistence.sql...
Applying migration 20260704180000_backend_hardening_phase2.sql...
Applying migration 20260704180000_kai_accountability_personality.sql...
Stopping containers...
Pruned containers: [ba319b9809d61c8164326b496488424df586d8da0d84fdc8685bd7c3d677b290]
Pruned volumes: [supabase_db_kaify-local]
Pruned network: [supabase_network_kaify-local]
[31mERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20260704180000) already exists.
At statement: 1
INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)[39m
```

## docker ps -a
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```
