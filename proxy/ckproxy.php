<?php
// ckproxy.php?url=https%3A%2F%2Fapi.cryptokitties.co%2Fv3%2Fkitties%2F124653
// ckproxy.php?url=%2Fsvg%2F124653.svg  (optional same-origin relative pass-through)

declare(strict_types=1);

$allowHosts = [
  "api.cryptokitties.co",
  "www.cryptokitties.co",
  "cryptokitties.co"
];

// Basic CORS for your site. Set to your real domain for safety.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

$url = $_GET["url"] ?? "";
if ($url === "") {
  http_response_code(400);
  header("Content-Type: text/plain; charset=utf-8");
  echo "Missing url parameter";
  exit;
}

// Allow relative URLs (to your own host) if you want
if (str_starts_with($url, "/")) {
  $scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
  $host = $_SERVER["HTTP_HOST"] ?? "";
  $url = $scheme . "://" . $host . $url;
}

$parts = parse_url($url);
if (!$parts || !isset($parts["scheme"], $parts["host"])) {
  http_response_code(400);
  header("Content-Type: text/plain; charset=utf-8");
  echo "Invalid URL";
  exit;
}

if ($parts["scheme"] !== "https") {
  http_response_code(400);
  header("Content-Type: text/plain; charset=utf-8");
  echo "Only https allowed";
  exit;
}

$host = strtolower($parts["host"]);
if (!in_array($host, $allowHosts, true)) {
  http_response_code(403);
  header("Content-Type: text/plain; charset=utf-8");
  echo "Host not allowed";
  exit;
}

// Fetch (FOLLOWLOCATION disabled to prevent open redirect bypass of host allowlist)
$ch = curl_init();
curl_setopt_array($ch, [
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_HEADER => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 15,
  CURLOPT_USERAGENT => "CKProxy/1.0",
]);

$resp = curl_exec($ch);
if ($resp === false) {
  http_response_code(502);
  header("Content-Type: text/plain; charset=utf-8");
  echo "Fetch failed: " . curl_error($ch);
  curl_close($ch);
  exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: "application/octet-stream";

curl_close($ch);

$headers = substr($resp, 0, $headerSize);
$body = substr($resp, $headerSize);

http_response_code($status);

// Pass through content-type, and add caching for SVG/JSON
header("Content-Type: " . $contentType);
header("Cache-Control: public, max-age=3600");

echo $body;
