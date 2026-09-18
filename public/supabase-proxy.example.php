<?php
// Copy this file to supabase-proxy.php and set YOUR project URL.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: authorization, x-lc-authorization, content-type, apikey, x-client-info");
header("Access-Control-Allow-Methods: *");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("CDN-Cache-Control: no-store");
header("Surrogate-Control: no-store");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$queryString = $_SERVER['QUERY_STRING'] ?? '';
$path = '';
if (preg_match('/path=([^&]+)/', $queryString, $matches)) {
    $path = urldecode($matches[1]);
    $extraQuery = preg_replace('/path=[^&]+&?/', '', $queryString);
    if (!empty($extraQuery)) {
        if (strpos($path, '?') !== false) {
            $path .= '&' . $extraQuery;
        } else {
            $path .= '?' . $extraQuery;
        }
    }
}

if (empty($path)) {
    http_response_code(400);
    echo json_encode(["error" => "Path is required"]);
    exit;
}

// Settings → API → Project URL, then add /functions/v1/
$SUPABASE_FUNCTIONS_BASE = "https://your_project_ref.supabase.co/functions/v1/";
$supabaseUrl = $SUPABASE_FUNCTIONS_BASE . $path;

$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];
$headersByName = [];
foreach ($incomingHeaders as $name => $value) {
    $headersByName[strtolower($name)] = $value;
}

$authorization =
    $headersByName['authorization'] ??
    $headersByName['x-lc-authorization'] ??
    ($_SERVER['HTTP_AUTHORIZATION'] ?? null) ??
    ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null) ??
    ($_SERVER['HTTP_X_LC_AUTHORIZATION'] ?? null);

$headers = [];
if ($authorization) {
    $headers[] = "Authorization: $authorization";
}

foreach ($headersByName as $name => $value) {
    if (in_array($name, ['content-type', 'apikey', 'x-client-info'])) {
        $headers[] = "$name: $value";
    }
}

$ch = curl_init($supabaseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

curl_close($ch);

http_response_code($httpCode);
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("CDN-Cache-Control: no-store");
header("Surrogate-Control: no-store");
if ($contentType) {
    header("Content-Type: $contentType");
}
echo $response;
