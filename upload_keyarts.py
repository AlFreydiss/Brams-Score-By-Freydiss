# -*- coding: utf-8 -*-
# Upload des keyarts HD du hero vers R2 (anime/keyart/<id>.jpg), écrase les bannières.
import boto3, os

ENV = r'C:\Users\Feydi\Desktop\Brams-Score-By-Freydiss\.env.upload'
env = {}
with open(ENV, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

FILES = {
    r'C:\Users\Feydi\Desktop\snk anime et scan.jpg': 'aot',
    r'C:\Users\Feydi\Desktop\ichigo-kurosaki- Bleach Banner anime et scan.jpeg': 'bleach',
    r'C:\Users\Feydi\Desktop\Kaiju NO 8 ANIM EET SCAN.jpg': 'kaiju-no-8',
    r'C:\Users\Feydi\Desktop\one piece anime et scan.jpg': 'onepiece',
    r'C:\Users\Feydi\Desktop\Jujutsu Kaisen anime et scan jjk.jpg': 'jjk',
}

# Même endpoint/bucket que upload_bleach.py (le .env ne porte que les clés)
account = '166b8357e5229b31a88cf104058ed5ee'
s3 = boto3.client(
    's3',
    endpoint_url=f'https://{account}.r2.cloudflarestorage.com',
    aws_access_key_id=env.get('R2_ACCESS_KEY'),
    aws_secret_access_key=env.get('R2_SECRET_KEY'),
    region_name='auto',
)
bucket = 'bramscore'

for path, slug in FILES.items():
    key = f'anime/keyart/{slug}.jpg'
    s3.upload_file(path, bucket, key, ExtraArgs={'ContentType': 'image/jpeg', 'CacheControl': 'public, max-age=86400'})
    print(f'OK {key} <- {os.path.basename(path)} ({os.path.getsize(path)//1024} Ko)')
print('Termine.')
