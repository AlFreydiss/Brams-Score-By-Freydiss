import sys, boto3
from botocore.config import Config
sys.stdout.reconfigure(encoding='utf-8')

ACCOUNT_ID = '166b8357e5229b31a88cf104058ed5ee'
ACCESS_KEY = '4f39550055d95fe0f9999e5011c91d68'
SECRET_KEY = 'dc832c19090b450439e85e03290339127957047fc61c447a179e5e2def52ba93'
BUCKET     = 'bramscore'

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto',
)

# Test 1: list buckets
print('Test 1 — list buckets...')
try:
    r = s3.list_buckets()
    print('  ✅ OK:', [b['Name'] for b in r['Buckets']])
except Exception as e:
    print('  ❌', e)

# Test 2: put small object
print('Test 2 — upload 1 KB...')
try:
    s3.put_object(Bucket=BUCKET, Key='test/hello.txt', Body=b'hello world', ContentType='text/plain')
    print('  ✅ Upload simple OK')
except Exception as e:
    print('  ❌', e)

# Test 3: create multipart
print('Test 3 — create multipart upload...')
try:
    r = s3.create_multipart_upload(Bucket=BUCKET, Key='test/multipart.mkv', ContentType='video/x-matroska')
    uid = r['UploadId']
    print('  ✅ Multipart créé, UploadId:', uid[:20], '...')
    s3.abort_multipart_upload(Bucket=BUCKET, Key='test/multipart.mkv', UploadId=uid)
    print('  ✅ Abort OK')
except Exception as e:
    print('  ❌', e)
