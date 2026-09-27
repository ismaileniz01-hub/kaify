# CI DB failure (2026-09-27T04:37:18Z)
sha: d4150a5538e59e3991d272373022062f315578a8
run: https://github.com/ismaileniz01-hub/kaify/actions/runs/36294746620
attempt: 1
## supabase-start.log
```
WARN: config section [inbucket] is deprecated. Please use [local_smtp] instead.
v14.16: Pulling from supabase/postgrest
Error response from daemon: toomanyrequests: Rate exceeded
Retrying after 4s: public.ecr.aws/supabase/mailpit:v1.30.2
v1.68.10: Pulling from supabase/storage-api
2.8.1: Pulling from supabase/kong
15.8.1.085: Pulling from supabase/postgres
dce57f6d1cdf: Pulling fs layer
toomanyrequests: Rate exceeded
Retrying after 4s: public.ecr.aws/supabase/postgres:15.8.1.085
v2.195.0: Pulling from supabase/gotrue
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
dbd229483e61: Waiting
f4e2bfbd8bcd: Waiting
521c5280947c: Waiting
3f609ae12598: Waiting
35d5e54f513a: Waiting
25e9c8801257: Waiting
331c4f30549c: Waiting
294ed970ec07: Waiting
0cd3238360a9: Waiting
601df250e23a: Waiting
e1511382296b: Waiting
ebf0f77af059: Waiting
213ec9aee27d: Pulling fs layer
a70653f7a2d5: Pulling fs layer
531e3bd93090: Pulling fs layer
814dd06d26c7: Pulling fs layer
213ec9aee27d: Waiting
a70653f7a2d5: Waiting
531e3bd93090: Waiting
814dd06d26c7: Waiting
toomanyrequests: Rate exceeded
Retrying after 4s: public.ecr.aws/supabase/gotrue:v2.195.0
dce57f6d1cdf: Verifying Checksum
dce57f6d1cdf: Download complete
e6f31ffc071e: Verifying Checksum
e6f31ffc071e: Download complete
dce57f6d1cdf: Pull complete
Digest: sha256:bea1c76a856fa39d1e542d25911cf95d02fe2bf971992d033044ff209f1504b8
Status: Downloaded newer image for public.ecr.aws/supabase/postgrest:v14.16
public.ecr.aws/supabase/postgrest:v14.16
e6f31ffc071e: Pull complete
f4e2bfbd8bcd: Verifying Checksum
f4e2bfbd8bcd: Download complete
5f05fbb94ac9: Verifying Checksum
5f05fbb94ac9: Download complete
dbd229483e61: Verifying Checksum
dbd229483e61: Download complete
3f609ae12598: Verifying Checksum
3f609ae12598: Download complete
35d5e54f513a: Verifying Checksum
35d5e54f513a: Download complete
25e9c8801257: Verifying Checksum
25e9c8801257: Download complete
294ed970ec07: Verifying Checksum
294ed970ec07: Download complete
521c5280947c: Verifying Checksum
521c5280947c: Download complete
331c4f30549c: Verifying Checksum
331c4f30549c: Download complete
e1511382296b: Download complete
601df250e23a: Verifying Checksum
601df250e23a: Download complete
ebf0f77af059: Download complete
0cd3238360a9: Verifying Checksum
0cd3238360a9: Download complete
a70653f7a2d5: Verifying Checksum
a70653f7a2d5: Download complete
213ec9aee27d: Verifying Checksum
213ec9aee27d: Download complete
814dd06d26c7: Verifying Checksum
814dd06d26c7: Download complete
213ec9aee27d: Pull complete
531e3bd93090: Verifying Checksum
531e3bd93090: Download complete
a70653f7a2d5: Pull complete
5f05fbb94ac9: Pull complete
dbd229483e61: Pull complete
f4e2bfbd8bcd: Pull complete
Error response from daemon: toomanyrequests: Rate exceeded
Retrying after 8s: public.ecr.aws/supabase/postgres:15.8.1.085
v1.30.2: Pulling from supabase/mailpit
v2.195.0: Pulling from supabase/gotrue
55afa1ecc21d: Already exists
55afa1ecc21d: Already exists
565df2d910df: Pulling fs layer
dc286a8aa197: Pulling fs layer
3b1d86731cf1: Pulling fs layer
fd855b1da301: Pulling fs layer
ad8aa6f5f9a9: Pulling fs layer
fd855b1da301: Waiting
ad8aa6f5f9a9: Waiting
95403727e7d4: Pulling fs layer
e326d083c2c9: Pulling fs layer
95403727e7d4: Waiting
e326d083c2c9: Waiting
565df2d910df: Verifying Checksum
565df2d910df: Download complete
dc286a8aa197: Verifying Checksum
dc286a8aa197: Download complete
565df2d910df: Pull complete
fd855b1da301: Verifying Checksum
fd855b1da301: Download complete
dc286a8aa197: Pull complete
ad8aa6f5f9a9: Verifying Checksum
ad8aa6f5f9a9: Download complete
3b1d86731cf1: Verifying Checksum
3b1d86731cf1: Download complete
e326d083c2c9: Verifying Checksum
e326d083c2c9: Download complete
95403727e7d4: Verifying Checksum
95403727e7d4: Download complete
3b1d86731cf1: Pull complete
fd855b1da301: Pull complete
ad8aa6f5f9a9: Pull complete
Digest: sha256:362659ca70eaa75ba05bbaf963caa84c1c5afe5e8fbf0777e17b830dd5f0f60a
Status: Downloaded newer image for public.ecr.aws/supabase/gotrue:v2.195.0
public.ecr.aws/supabase/gotrue:v2.195.0
95403727e7d4: Pull complete
e326d083c2c9: Pull complete
Digest: sha256:37a38e48e9338cd7e89dfeb487f37b02ebfcd9cb23111bed2d345e79d37d6dd6
Status: Downloaded newer image for public.ecr.aws/supabase/mailpit:v1.30.2
public.ecr.aws/supabase/mailpit:v1.30.2
531e3bd93090: Pull complete
814dd06d26c7: Pull complete
Digest: sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d
Status: Downloaded newer image for public.ecr.aws/supabase/kong:2.8.1
public.ecr.aws/supabase/kong:2.8.1
521c5280947c: Pull complete
3f609ae12598: Pull complete
35d5e54f513a: Pull complete
25e9c8801257: Pull complete
331c4f30549c: Pull complete
294ed970ec07: Pull complete
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
1f87a4556ee4: Pulling fs layer
586e7e55dc38: Pulling fs layer
58c2f4245eec: Pulling fs layer
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
44bd6c2c1e25: Pulling fs layer
14c7c40f264e: Waiting
7e1afeac9515: Waiting
7dd51689e5de: Waiting
4f4fb700ef54: Waiting
daa7c753cf32: Waiting
c61d94d80b8d: Waiting
73d5273f17e0: Waiting
5d4d12d40ee2: Waiting
bec4cd2d8288: Waiting
5bd4dd8b80e3: Waiting
f54c636bbcd3: Waiting
a00ab32c0cad: Waiting
ab6d1e52f2bb: Waiting
7df60113bd5f: Waiting
e12ac39a69ef: Waiting
1f87a4556ee4: Waiting
04364d336696: Waiting
e68f98342a0d: Waiting
586e7e55dc38: Waiting
669f792103a4: Waiting
58c2f4245eec: Waiting
826b8d755762: Waiting
f80d99bfabdb: Waiting
d0ebd75bb4ef: Waiting
18e11daf70d2: Waiting
a1028bd6f848: Waiting
9ace01da70a3: Waiting
44bd6c2c1e25: Waiting
1f04457496a9: Waiting
2a75afedac1e: Waiting
addf9dc09fca: Waiting
95553dc9aee4: Waiting
1e3ae6415742: Waiting
cef3e4219e2d: Waiting
2d3eb0cf3634: Waiting
83a5975346e8: Waiting
cb6a11cda9f8: Waiting
848b1c5912e5: Waiting
f2c897740b67: Waiting
5904fe0a8541: Waiting
484e22708485: Waiting
0f819c04149e: Waiting
4e5b5a409361: Waiting
b87ddba4145f: Verifying Checksum
b87ddba4145f: Download complete
14c7c40f264e: Verifying Checksum
14c7c40f264e: Download complete
13b7e930469f: Verifying Checksum
13b7e930469f: Download complete
fff1a581b40e: Verifying Checksum
fff1a581b40e: Download complete
7dd51689e5de: Verifying Checksum
7dd51689e5de: Download complete
4f4fb700ef54: Verifying Checksum
4f4fb700ef54: Download complete
7e1afeac9515: Verifying Checksum
7e1afeac9515: Download complete
c61d94d80b8d: Verifying Checksum
c61d94d80b8d: Download complete
73d5273f17e0: Verifying Checksum
73d5273f17e0: Download complete
bec4cd2d8288: Verifying Checksum
bec4cd2d8288: Download complete
5d4d12d40ee2: Verifying Checksum
5d4d12d40ee2: Download complete
95553dc9aee4: Verifying Checksum
95553dc9aee4: Download complete
cef3e4219e2d: Verifying Checksum
cef3e4219e2d: Download complete
13b7e930469f: Pull complete
83a5975346e8: Verifying Checksum
83a5975346e8: Download complete
f2c897740b67: Verifying Checksum
f2c897740b67: Download complete
848b1c5912e5: Verifying Checksum
848b1c5912e5: Download complete
daa7c753cf32: Verifying Checksum
daa7c753cf32: Download complete
0f819c04149e: Verifying Checksum
0f819c04149e: Download complete
addf9dc09fca: Verifying Checksum
addf9dc09fca: Download complete
4e5b5a409361: Verifying Checksum
4e5b5a409361: Download complete
2d3eb0cf3634: Download complete
cb6a11cda9f8: Verifying Checksum
cb6a11cda9f8: Download complete
5904fe0a8541: Verifying Checksum
5904fe0a8541: Download complete
1e3ae6415742: Verifying Checksum
1e3ae6415742: Download complete
a00ab32c0cad: Verifying Checksum
a00ab32c0cad: Download complete
484e22708485: Verifying Checksum
484e22708485: Download complete
5bd4dd8b80e3: Verifying Checksum
5bd4dd8b80e3: Download complete
7df60113bd5f: Verifying Checksum
7df60113bd5f: Download complete
1f87a4556ee4: Verifying Checksum
1f87a4556ee4: Download complete
826b8d755762: Verifying Checksum
826b8d755762: Download complete
58c2f4245eec: Verifying Checksum
58c2f4245eec: Download complete
586e7e55dc38: Verifying Checksum
586e7e55dc38: Download complete
18e11daf70d2: Verifying Checksum
18e11daf70d2: Download complete
9ace01da70a3: Verifying Checksum
9ace01da70a3: Download complete
1f04457496a9: Verifying Checksum
1f04457496a9: Download complete
2a75afedac1e: Verifying Checksum
2a75afedac1e: Download complete
f54c636bbcd3: Verifying Checksum
f54c636bbcd3: Download complete
ab6d1e52f2bb: Verifying Checksum
ab6d1e52f2bb: Download complete
04364d336696: Download complete
e12ac39a69ef: Verifying Checksum
e12ac39a69ef: Download complete
e68f98342a0d: Verifying Checksum
e68f98342a0d: Download complete
669f792103a4: Verifying Checksum
669f792103a4: Download complete
f80d99bfabdb: Verifying Checksum
f80d99bfabdb: Download complete
44bd6c2c1e25: Verifying Checksum
44bd6c2c1e25: Download complete
d0ebd75bb4ef: Verifying Checksum
d0ebd75bb4ef: Download complete
a1028bd6f848: Verifying Checksum
a1028bd6f848: Download complete
fff1a581b40e: Pull complete
b87ddba4145f: Pull complete
14c7c40f264e: Pull complete
7e1afeac9515: Pull complete
7dd51689e5de: Pull complete
4f4fb700ef54: Pull complete
0cd3238360a9: Pull complete
601df250e23a: Pull complete
e1511382296b: Pull complete
ebf0f77af059: Pull complete
Digest: sha256:2036b42317d417a6f8a805f168b3fe137a14bd3745028189fa311f7f222f867d
Status: Downloaded newer image for public.ecr.aws/supabase/storage-api:v1.68.10
public.ecr.aws/supabase/storage-api:v1.68.10
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
Status: Downloaded newer image for public.ecr.aws/supabase/postgres:15.8.1.085
public.ecr.aws/supabase/postgres:15.8.1.085
Starting database...
Stopping containers...
[31mfailed to start docker container "supabase_db_kaify-local": Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint supabase_db_kaify-local (a9a5f3b105107e978a4a5368513a58b18051cae34e5ffa05173ed38377312f74): failed to bind host port for 0.0.0.0:54322:172.18.0.2:5432/tcp: address already in use
Error: failed to start containers: d5dae07f68ce9f1cce09b9c1f657394047adedf60cc834221e94c68cfef83f4f[39m
Try rerunning the command with --debug to troubleshoot the error.
```
## supabase-db-reset-1.log
_missing_
## supabase-db-reset-2.log
_missing_
## supabase-status.env
_missing_
## supabase-status.json
_missing_
## docker-ps.txt
_missing_
## supabase-test-db.log
_missing_
