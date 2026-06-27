$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$mobileRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidRoot = Join-Path $mobileRoot "android"
$javaHome = Join-Path $repoRoot ".local-tools\jdk17\jdk-17.0.19+10"
$androidSdk = Join-Path $repoRoot ".local-tools\android-sdk"

if (-not (Test-Path (Join-Path $javaHome "bin\java.exe"))) {
  throw "No se encontro Java local en $javaHome"
}

if (-not (Test-Path (Join-Path $androidSdk "platforms"))) {
  throw "No se encontro Android SDK local en $androidSdk"
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:NODE_ENV = "production"
$env:Path = "$javaHome\bin;$androidSdk\platform-tools;$androidSdk\cmdline-tools\latest\bin;$env:Path"

Push-Location $androidRoot
try {
  .\gradlew.bat assembleRelease
}
finally {
  Pop-Location
}

$releaseApk = Join-Path $androidRoot "app\build\outputs\apk\release\app-release.apk"
$distDir = Join-Path $mobileRoot "dist"
$distApk = Join-Path $distDir "AutoFlow-Mobile-0.1.1-release.apk"

New-Item -ItemType Directory -Path $distDir -Force | Out-Null
Copy-Item -LiteralPath $releaseApk -Destination $distApk -Force

$hash = (Get-FileHash -Path $distApk -Algorithm SHA256).Hash
Set-Content -Path "$distApk.sha256" -Value "$hash  AutoFlow-Mobile-0.1.1-release.apk" -Encoding ascii

Write-Host "APK generada: $distApk"
Write-Host "SHA256: $hash"
