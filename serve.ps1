# Jednoduchy staticky HTTP server pro lokalni vyvoj/testovani (Node/Python nejsou v tomto prostredi
# k dispozici). Slouzi jen k rucnimu spusteni behem vyvoje - neni soucasti produkcniho reseni.
$port = 8080
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
  ".ttf"  = "font/ttf"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $res = $context.Response
  try {
    $relPath = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
    if ($relPath -eq "/") { $relPath = "/app/index.html" }
    $filePath = Join-Path $root ($relPath.TrimStart("/"))
    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = $contentType
      $res.ContentLength64 = [int64]$bytes.Length
      $res.StatusCode = 200
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relPath")
      $res.ContentLength64 = [int64]$msg.Length
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try {
      $res.StatusCode = 500
      $errMsg = [System.Text.Encoding]::UTF8.GetBytes("500 Error: " + $_.Exception.Message)
      $res.ContentLength64 = [int64]$errMsg.Length
      $res.OutputStream.Write($errMsg, 0, $errMsg.Length)
    } catch {}
    Write-Host "ERROR handling $($req.Url): $($_.Exception.Message)"
  } finally {
    $res.OutputStream.Close()
  }
}
