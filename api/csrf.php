<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/security.php';
security_bootstrap();
security_headers_json();

echo json_encode(['ok' => true, 'csrfToken' => csrf_token()]);
