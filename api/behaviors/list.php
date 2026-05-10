<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_csrf();
require_once __DIR__ . "/../../config/db.php";
$include_inactive = (int)($_GET["include_inactive"] ?? 0) === 1;

// Defaults on top, then alphabetical
$sql = "
  SELECT
    b.behavior_id,
    b.behavior_text,
    b.is_active,
    b.created_at,
    b.is_default,
    COUNT(sba.id) AS current_assignment_count,
    GROUP_CONCAT(
      CONCAT(COALESCE(s.last, ''), ', ', COALESCE(s.first, ''))
      ORDER BY s.last ASC, s.first ASC
      SEPARATOR '\n'
    ) AS assigned_students
  FROM behaviors b
  LEFT JOIN student_behavior_assignments sba
    ON sba.behavior_id = b.behavior_id
   AND sba.end_date IS NULL
  LEFT JOIN student s
    ON s.ID = sba.student_id
  " . ($include_inactive ? "" : "WHERE b.is_active = 1") . "
  GROUP BY b.behavior_id, b.behavior_text, b.is_active, b.created_at, b.is_default
  ORDER BY b.is_default DESC, b.behavior_text ASC
";

$res = $conn->query($sql);
if (!$res) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$data = [];
while ($row = $res->fetch_assoc()) {
  $assigned_students = [];
  if (!empty($row["assigned_students"])) {
    $assigned_students = array_values(array_filter(
      array_map("trim", explode("\n", $row["assigned_students"])),
      fn($name) => $name !== ","
    ));
  }

  $data[] = [
    "behavior_id" => (int)$row["behavior_id"],
    "behavior_text" => $row["behavior_text"],
    "is_active" => (int)$row["is_active"],
    "is_default" => (int)$row["is_default"],
    "created_at" => $row["created_at"],
    "current_assignment_count" => (int)$row["current_assignment_count"],
    "assigned_students" => $assigned_students,
  ];
}

echo json_encode(["ok" => true, "data" => $data]);
