<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_admin();
header("Content-Type: application/json; charset=utf-8");
http_response_code(501);
echo json_encode(["ok" => false, "error" => "Delete not implemented yet."]);
