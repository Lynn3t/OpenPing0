<?php
// URL路由解析 - 支持 /ip/1.1.1.1 格式
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$routeIp = null;
$path = trim($uri, '/');
$parts = $path === '' ? [] : explode('/', $path);

if (count($parts) >= 2 && strtolower($parts[0]) === 'ip') {
    $candidate = trim($parts[1]);
    
    // 特殊路由处理
    if($candidate === 'getdns' || $candidate === 'peer') {
        switch ($candidate) {
            case 'getdns':
                echo 'ipyard.com';
                break;
            default:
                http_response_code(204);
                break;
        }
        exit;
    }
    
    // IP地址验证
    if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ||
        filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $routeIp = $candidate;
    } elseif (preg_match('/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/', $candidate)) {
        // 域名解析
        $resolvedIp = gethostbyname($candidate);
        if (filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ||
            filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $routeIp = $resolvedIp;
        }
    }
}

// 获取用户IP
$userIp = '';
if ($routeIp !== null) {
    $userIp = $routeIp;
} else {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwardedIps = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $userIp = trim($forwardedIps[0]);
    } else {
        $userIp = $_SERVER['REMOTE_ADDR'] ?? '';
    }
}

// 设置页面变量（提供默认值，实际数据由 check.js 获取）
$concurrentIpAddr = $userIp;
$asnNum = 0;
$asnName = 'IPYard';  
$asnDomain = 'ipyard.com';
$ip_longitude = '0.0';
$ip_latitude = '0.0';
$ip_city = '';
$ip_country = '';
$ip_stateOProvince = '';