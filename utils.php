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
    
    // IP地址验证 - 优先IPv4，拒绝IPv6
    if (filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $routeIp = $candidate;
    } elseif (preg_match('/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/', $candidate)) {
        // 域名解析 - 仅解析为IPv4
        $resolvedIp = gethostbyname($candidate);
        if (filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $routeIp = $resolvedIp;
        }
    }
}

// 获取用户IP - 优先IPv4，处理IPv6映射
$userIp = '';
if ($routeIp !== null) {
    $userIp = $routeIp;
} else {
    // 尝试从多个来源获取IP - 优先处理Cloudflare真实客户端IP
    $ipSources = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '',  // Cloudflare真实客户端IP
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
        $_SERVER['HTTP_X_REAL_IP'] ?? '',
        $_SERVER['HTTP_CLIENT_IP'] ?? '',
        $_SERVER['REMOTE_ADDR'] ?? ''
    ];
    
    foreach ($ipSources as $source) {
        if (empty($source)) continue;
        
        // 处理逗号分隔的IP列表
        $ips = explode(',', $source);
        foreach ($ips as $ip) {
            $ip = trim($ip);
            
            // 处理IPv6映射的IPv4地址 (::ffff:192.168.1.1)
            if (preg_match('/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i', $ip, $matches)) {
                $ip = $matches[1];
            }
            
            // 验证是否为有效的IPv4地址，排除私有地址
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                $userIp = $ip;
                break 2; // 跳出两层循环
            }
            
            // 如果没有找到公网IPv4，接受私有IPv4地址
            if (empty($userIp) && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $userIp = $ip;
            }
        }
    }
    
    // 如果仍然没有获取到IPv4地址，尝试通过外部服务获取
    if (empty($userIp)) {
        $userIp = getPublicIPv4();
    }
}

// 获取公网IPv4地址的辅助函数
function getPublicIPv4() {
    $services = [
        'https://ipv4.icanhazip.com/',
        'https://api.ipify.org/',
        'https://ipv4.ident.me/'
    ];
    
    foreach ($services as $service) {
        $context = stream_context_create([
            'http' => [
                'timeout' => 3,
                'method' => 'GET',
                'header' => 'User-Agent: OpenPing/1.0'
            ]
        ]);
        
        $ip = @file_get_contents($service, false, $context);
        if ($ip && filter_var(trim($ip), FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return trim($ip);
        }
    }
    
    return '';
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