$ErrorActionPreference = 'Stop'
$demoCompose = Join-Path $PSScriptRoot 'company-demo.compose.yaml'
$demoOrigin = 'http://127.0.0.1:3320'
docker compose -p riverlife-company-demo -f $demoCompose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'Company demo startup failed' }
for ($attempt=0; $attempt -lt 30; $attempt++) {
    try { $health=Invoke-RestMethod "$demoOrigin/api/v1/health"; if ($health.status -eq 'ok') { break } } catch {}
    Start-Sleep -Seconds 1
}
if ($health.status -ne 'ok') { throw 'Company demo API unavailable' }
$config=Invoke-RestMethod "$demoOrigin/api/v1/cruise-checkout/config"
if ($config.payment_gateway_enabled -or $config.email_delivery_enabled) { throw 'Refusing to seed with outgoing payments or mail enabled' }
$dbIdentity=docker compose -p riverlife-company-demo -f $demoCompose exec -T postgres psql -U demo -d company_demo -At -c "SELECT current_database() || ':' || current_user"
if ($dbIdentity -ne 'company_demo:demo') { throw 'Unexpected database; refusing demo seeding' }

# These credentials belong only to the isolated, loopback-only demonstration.
$demoPassword='DemoOnly-2026!'
$demoAccounts=@('demo-admin@example.test','demo-a@example.test','demo-b@example.test')
foreach ($email in $demoAccounts) {
    $session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
    try {
        $null=Invoke-RestMethod "$demoOrigin/api/v1/auth/login" -Method Post -WebSession $session -ContentType 'application/json' -Body (@{email=$email;password=$demoPassword}|ConvertTo-Json)
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 401) { throw }
        $challenge=Invoke-RestMethod "$demoOrigin/api/v1/auth/signup/request" -Method Post -ContentType 'application/json' -Body (@{email=$email;name="DEMO $($email.Split('@')[0])";password=$demoPassword}|ConvertTo-Json)
        if (!$challenge.demo_code) { throw 'Expected local demo OTP; no external delivery is allowed' }
        $null=Invoke-RestMethod "$demoOrigin/api/v1/auth/signup/verify" -Method Post -WebSession $session -ContentType 'application/json' -Body (@{email=$email;code=$challenge.demo_code}|ConvertTo-Json)
    }
}
$null=docker compose -p riverlife-company-demo -f $demoCompose exec -T postgres psql -U demo -d company_demo -v ON_ERROR_STOP=1 -c "UPDATE users SET role='admin' WHERE email='demo-admin@example.test'"
if ($LASTEXITCODE -ne 0) { throw 'Demo admin setup failed' }
$adminSession=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$null=Invoke-RestMethod "$demoOrigin/api/v1/auth/login" -Method Post -WebSession $adminSession -ContentType 'application/json' -Body (@{email=$demoAccounts[0];password=$demoPassword}|ConvertTo-Json)
$existing=Invoke-RestMethod "$demoOrigin/api/v1/dashboard/admin/cruises/sailings" -WebSession $adminSession
if (!($existing | Where-Object { $_.title -like '[[]DEMO[]]*' -and $_.status -eq 'published' -and [DateTimeOffset]$_.departure_at -gt [DateTimeOffset]::Now })) {
    $departure=[DateTimeOffset]::Now.AddDays(7)
    $demoTables=@(
        @{id='U01';deck='upper';seats=4;price=800000;seat_price=210000;x=280;y=150},
        @{id='U02';deck='upper';seats=4;price=800000;seat_price=210000;x=480;y=150},
        @{id='L01';deck='lower';seats=4;price=680000;seat_price=180000;x=280;y=410},
        @{id='L02';deck='lower';seats=4;price=680000;seat_price=180000;x=480;y=410}
    )
    $demoSailing=@{
        vessel_id='unicorn'; title='[DEMO] Unicorn Cruise — ตัวอย่าง ไม่เปิดขาย';status='published';verified=$true
        departure_at=$departure.ToString('o');boarding_at=$departure.AddMinutes(-30).ToString('o');pier='[DEMO] ICONSIAM — ท่าและเวลาเป็นตัวอย่าง'
        tables=$demoTables
        extras=@(
            @{id='demo-seafood';name='[DEMO] ซีฟู้ดจานพิเศษ';category='food';description='ตัวอย่างเพื่อสาธิต ไม่ใช่เมนูหรือราคาที่เรือยืนยัน';image='/images/food-gallery/buffet-02-v2.webp';price=60000;stock=20;enabled=$true},
            @{id='demo-wine';name='[DEMO] ไวน์แดง';category='wine';description='ตัวอย่างเพื่อสาธิต ไม่ใช่สินค้าที่เปิดขาย';image='/images/booking/wine-preview.png';price=140000;stock=20;enabled=$true}
        )
    }
    $null=Invoke-RestMethod "$demoOrigin/api/v1/dashboard/admin/cruises/sailings" -Method Post -WebSession $adminSession -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($demoSailing|ConvertTo-Json -Depth 8)))
}
Write-Output "Company demo ready: $demoOrigin/booking"
Write-Output 'Accounts: demo-a@example.test, demo-b@example.test, demo-admin@example.test'
Write-Output 'Demo-only password: DemoOnly-2026!'
Write-Output 'Sample data only. Payments and outgoing emails are disabled. Main database is separate.'
