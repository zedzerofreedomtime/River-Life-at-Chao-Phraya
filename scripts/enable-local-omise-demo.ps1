$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$config = Invoke-RestMethod 'http://localhost:3000/api/v1/cruise-checkout/config'
if (!$config.payment_gateway_enabled -or !$config.sandbox -or $config.provider -ne 'omise') { throw 'Omise sandbox must be configured first' }
$mode = docker compose exec -T api printenv DEMO_MODE
if ($LASTEXITCODE -ne 0 -or $mode.Trim() -ne 'true') { throw 'Refusing to seed outside local demo mode' }
$identity = docker compose exec -T postgres psql -U riverlife -d riverlife -At -c "SELECT current_database() || ':' || current_user"
if ($identity.Trim() -ne 'riverlife:riverlife') { throw 'Unexpected local database' }
$sailingId = 'demo_omise_' + (Get-Date -Format yyyyMMdd)
$exists = docker compose exec -T postgres psql -U riverlife -d riverlife -At -c "SELECT count(*) FROM sailings WHERE id='$sailingId'"
if ($exists.Trim() -eq '0') {
    $backupDirectory = Join-Path $env:LOCALAPPDATA ('RiverLife/backups/omise-demo-' + (Get-Date -Format yyyyMMdd-HHmmss))
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    docker compose exec -T postgres pg_dump -U riverlife -d riverlife -Fc -f /tmp/riverlife-before-omise-demo.dump
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed' }
    docker compose cp postgres:/tmp/riverlife-before-omise-demo.dump (Join-Path $backupDirectory 'riverlife.dump')
    if ($LASTEXITCODE -ne 0) { throw 'Backup copy failed' }
    docker compose exec -T postgres pg_restore --list /tmp/riverlife-before-omise-demo.dump | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Backup archive could not be read' }
    $seed = @'
BEGIN;
INSERT INTO sailings(id,vessel_id,title,departure_at,boarding_at,pier,status,verified,extras)
VALUES (:'sailing_id','unicorn','[DEMO] Unicorn — Omise Sandbox / ไม่ใช่รอบขายจริง',
 ((now() AT TIME ZONE 'Asia/Bangkok')::date + 7 + time '19:00') AT TIME ZONE 'Asia/Bangkok',
 ((now() AT TIME ZONE 'Asia/Bangkok')::date + 7 + time '18:45') AT TIME ZONE 'Asia/Bangkok',
 'ICONSIAM ท่าเรือที่ 4','published',true,
 '[{"id":"demo-seafood","name":"[DEMO] ซีฟู้ดจานพิเศษ","category":"food","description":"รายการและราคาทดสอบเท่านั้น","image":"/images/food-gallery/buffet-02-v2.webp","price":60000,"stock":100,"enabled":true},{"id":"demo-wine","name":"[DEMO] ไวน์แดง","category":"wine","description":"รายการและราคาทดสอบเท่านั้น","image":"/images/booking/wine-preview.png","price":140000,"stock":100,"enabled":true}]'::jsonb);
INSERT INTO sailing_tables(sailing_id,id,deck,seats,price,seat_price,x,y)
SELECT :'sailing_id', prefix || lpad(i::text,2,'0'), deck,4,price,seat_price,
 280+((i-1)%4)*150, CASE WHEN i<=4 THEN 150 ELSE 410 END
FROM (VALUES ('U','upper',480000,120000),('L','lower',400000,100000)) AS d(prefix,deck,price,seat_price)
CROSS JOIN generate_series(1,8) AS i;
INSERT INTO cruise_admin_audit(actor_id,sailing_id,action)
SELECT id,:'sailing_id','seed:published:demo:user-authorized' FROM users WHERE role='admin' ORDER BY created_at LIMIT 1;
COMMIT;
'@
    $seed | docker compose exec -T postgres psql -U riverlife -d riverlife -v ON_ERROR_STOP=1 -v "sailing_id=$sailingId"
    if ($LASTEXITCODE -ne 0) { throw 'Demo seeding failed; transaction rolled back' }
    Write-Output "Backup: $backupDirectory"
}
$sailings = Invoke-RestMethod 'http://localhost:3000/api/v1/sailings?vessel=unicorn'
$demo = $sailings | Where-Object id -eq $sailingId
if (!$demo -or $demo.status -ne 'published' -or @($demo.tables).Count -ne 16) { throw 'Demo sailing verification failed' }
Write-Output "Sandbox demo ready: $sailingId (16 tables, individual chairs enabled). Open /booking and select the DEMO sailing."
