<?php
// PHP Reverse Proxy for Next.js (port 3000) & Go REST API (port 8080) on DirectAdmin VPS
// Place this file as 'index.php' inside your public_html directory.

// Fallback for getallheaders() if not running under Apache
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Route /api/ and /uploads/ to Go Backend, everything else to Next.js Frontend
if (strpos($requestUri, '/api/') === 0 || strpos($requestUri, '/uploads/') === 0) {
    $targetUrl = 'http://127.0.0.1:8080' . $requestUri;
} else {
    $targetUrl = 'http://127.0.0.1:3000' . $requestUri;
}

$isMultipart = (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false);

// Initialize cURL session
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

// Forward request headers
$headers = [];
foreach (getallheaders() as $name => $value) {
    $lowerName = strtolower($name);
    if (in_array($lowerName, ['host', 'content-length', 'connection'])) {
        continue;
    }
    // Skip original Content-Type header if multipart so cURL can generate a fresh boundary header
    if ($isMultipart && $lowerName === 'content-type') {
        continue;
    }
    $headers[] = "$name: $value";
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward request body for writing operations
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    if ($isMultipart) {
        $postData = $_POST;
        foreach ($_FILES as $key => $file) {
            if (empty($file['tmp_name'])) continue;
            if (is_array($file['tmp_name'])) {
                foreach ($file['tmp_name'] as $index => $tmpName) {
                    if (empty($tmpName)) continue;
                    $postData[$key . '[' . $index . ']'] = new CURLFile(
                        $tmpName,
                        $file['type'][$index],
                        $file['name'][$index]
                    );
                }
            } else {
                $postData[$key] = new CURLFile(
                    $file['tmp_name'],
                    $file['type'],
                    $file['name']
                );
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    } else {
        $body = file_get_contents('php://input');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

// Execute cURL
$response = curl_exec($ch);

if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo "<h1>502 Bad Gateway</h1><p>Cannot connect to the underlying service. Please make sure the PM2 servers (mbdb-frontend on port 3000, mbdb-backend on port 8080) are running.</p><p>Error: " . htmlspecialchars($error) . "</p>";
    exit;
}

// Split headers and body
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($ch);

// Send response headers
$headerLines = explode("\r\n", $responseHeaders);
foreach ($headerLines as $line) {
    if (empty($line)) continue;
    if (strpos(strtolower($line), 'transfer-encoding:') === 0) continue;
    if (strpos(strtolower($line), 'connection:') === 0) continue;
    header($line, false);
}

// Send response body
echo $responseBody;
