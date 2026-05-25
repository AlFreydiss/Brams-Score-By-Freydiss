// Usage: node delete-storage.mjs YOUR_PERSONAL_ACCESS_TOKEN
const PAT = process.argv[2]
const REF = 'zeqetrmulqndxugfbojd'

if (!PAT) { console.error('Usage: node delete-storage.mjs YOUR_PAT'); process.exit(1) }

const mgmtHeaders = { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }

async function mgmt(method, path, body) {
  const r = await fetch(`https://api.supabase.com/v1${path}`, { method, headers: mgmtHeaders, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  try { return { status: r.status, data: JSON.parse(text) } }
  catch { return { status: r.status, data: text } }
}

async function storageApi(method, path, serviceKey, body) {
  const headers = { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json', 'apikey': serviceKey }
  const r = await fetch(`https://${REF}.supabase.co/storage/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  try { return { status: r.status, data: JSON.parse(text) } }
  catch { return { status: r.status, data: text } }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const { data: keys } = await mgmt('GET', `/projects/${REF}/api-keys`)
  const serviceKey = Array.isArray(keys) && keys.find(k => k.name === 'service_role')?.api_key
  if (!serviceKey) { console.error('❌ Cannot get service_role key'); return }

  const { data: buckets } = await storageApi('GET', '/bucket', serviceKey)
  if (!Array.isArray(buckets)) { console.error('❌ Cannot list buckets:', buckets); return }
  if (buckets.length === 0) { console.log('✅ No buckets — storage already empty'); return }
  console.log(`Found ${buckets.length} bucket(s):`, buckets.map(b => b.id))

  for (const bucket of buckets) {
    console.log(`\n📂 Emptying bucket: ${bucket.id}`)
    const { status: es, data: er } = await storageApi('POST', `/bucket/${bucket.id}/empty`, serviceKey, {})
    console.log(`  empty → Status ${es}:`, er)

    // Retry deletion every 10s for up to 5 minutes
    let deleted = false
    for (let attempt = 1; attempt <= 30; attempt++) {
      console.log(`  🗑️  Delete attempt ${attempt}/30...`)
      const { status: del, data: dr } = await storageApi('DELETE', `/bucket/${bucket.id}`, serviceKey)
      console.log(`     Status ${del}:`, dr)
      if (del === 200) { console.log(`  ✅ Bucket ${bucket.id} deleted!`); deleted = true; break }
      if (del === 404) { console.log(`  ✅ Bucket ${bucket.id} already gone`); deleted = true; break }
      if (attempt < 30) { console.log('     Not empty yet, waiting 10s...'); await sleep(10000) }
    }
    if (!deleted) console.log(`  ⚠️  Could not delete ${bucket.id} after 5 min — try again later`)
  }

  console.log('\n✅ Done — check Supabase dashboard for storage usage')
}

main().catch(console.error)
