# -*- coding: utf-8 -*-
"""Liste les objets R2 sous des préfixes (usage: py r2_list_prefix.py anime/kny/ anime/hxh)."""
import boto3, sys
from pathlib import Path
from botocore.config import Config

sys.stdout.reconfigure(encoding="utf-8")
env = {}
for line in (Path(__file__).parent / ".env.upload").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
s3 = boto3.client("s3", endpoint_url="https://166b8357e5229b31a88cf104058ed5ee.r2.cloudflarestorage.com",
    aws_access_key_id=env["R2_ACCESS_KEY"], aws_secret_access_key=env["R2_SECRET_KEY"],
    config=Config(signature_version="s3v4"), region_name="auto")

for prefix in sys.argv[1:]:
    n = 0; tot = 0; keys = []
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket="bramscore", Prefix=prefix):
        for o in page.get("Contents", []):
            n += 1; tot += o["Size"]; keys.append((o["Key"], o["Size"]))
    print(f"--- {prefix} : {n} objets, {tot/1024**3:.1f} GB")
    for k, s in keys:
        if k.endswith(".mp4") or n <= 30:
            print(f"    {k}  ({s/1024**2:.0f} MB)")
