<#
  import-scans.ps1
  Copie les scans One Piece depuis F:\manga\one piece\one piece\
  vers brams-website\public\scans\ch{num}\
  et génère src\data\chapters-data.json avec les chemins exacts.
#>

$SOURCE  = "F:\manga\one piece\one piece"
$DEST    = "$PSScriptRoot\..\brams-website\public\scans"
$JSON_OUT = "$PSScriptRoot\..\brams-website\src\data\chapters-data.json"

$EMOJIS = @('🏴‍☠️','⚔️','📜','💥','🌊','🔥','👑','🌀','🛡️','⚡','🌋','🗡️','☀️','🔴','🏔️','🤝','💰','⛈️','🎯','🌸','💎','🌑','⚕️','💫','🌺','🦁','⚓')

# Crée le dossier de destination
New-Item -ItemType Directory -Force -Path $DEST | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $JSON_OUT) | Out-Null

$dirs = Get-ChildItem -Path $SOURCE -Directory | Sort-Object Name
$chapters = @()
$emojiIdx = 0

Write-Host "📁 Copie de $($dirs.Count) chapitres..."

foreach ($d in $dirs) {
    # Extrait le numéro de chapitre (premiers chiffres du nom)
    if ($d.Name -notmatch '^(\d+)') { continue }
    $num   = [int]$Matches[1]
    $title = ($d.Name -replace '^\d+\s*', '').Trim()

    # Dossier de destination ch{num}
    $chDest = Join-Path $DEST "ch$num"
    New-Item -ItemType Directory -Force -Path $chDest | Out-Null

    # Récupère les images (webp puis jpg selon ce qui existe)
    $imgs = Get-ChildItem -Path $d.FullName -File | Where-Object { $_.Extension -in '.webp', '.jpg', '.jpeg', '.png' } | Sort-Object Name

    if ($imgs.Count -eq 0) {
        Write-Host "  ⚠  Ch.$num — aucune image trouvée, ignoré"
        continue
    }

    $pages = @()
    foreach ($img in $imgs) {
        $dest = Join-Path $chDest $img.Name
        Copy-Item -Path $img.FullName -Destination $dest -Force
        $pages += "/scans/ch$num/$($img.Name)"
    }

    $chapters += [ordered]@{
        num   = $num
        title = $title
        emoji = $EMOJIS[$emojiIdx % $EMOJIS.Count]
        pages = $pages
    }
    $emojiIdx++
    Write-Host "  ✓  Ch.$num — $($pages.Count) pages copiées"
}

# Génère le JSON
$json = $chapters | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($JSON_OUT, $json, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "✅ $($chapters.Count) chapitres importés → $DEST"
Write-Host "✅ JSON généré → $JSON_OUT"
