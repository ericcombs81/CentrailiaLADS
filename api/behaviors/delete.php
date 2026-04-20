<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_csrf();
api_require_admin();
http_response_code(501);
echo json_encode(["ok" => false, "error" => "Delete not implemented yet."]);
