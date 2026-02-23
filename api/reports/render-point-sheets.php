<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("Database connection not available as \$conn (mysqli).");
  }

  $date = $_GET["date"] ?? "";
  if (!$date) throw new Exception("Missing date");

  // Optional: override the displayed date on the printed sheet (used by student modal date picker)
  $printDate = trim((string)($_GET["print_date"] ?? ""));
  if ($printDate === "") $printDate = $date;

  // Optional: comma-separated list of student IDs to render
  $studentIdsRaw = trim((string)($_GET["student_ids"] ?? ""));
  $studentIds = [];
  if ($studentIdsRaw !== "") {
    foreach (preg_split('/\s*,\s*/', $studentIdsRaw) as $tok) {
      if ($tok === "") continue;
      if (ctype_digit($tok)) $studentIds[] = (int)$tok;
    }
    $studentIds = array_values(array_unique($studentIds));
  }

  // Get sessions + student name + comments
  $sqlSessions = "
    SELECT
      bs.session_id,
      bs.comments,
      s.ID AS student_id,
      s.last,
      s.first
    FROM behavior_sessions bs
    JOIN student s ON s.ID = bs.student_id
    WHERE bs.session_date = ?
      AND s.status = 1
  ";

  if (count($studentIds)) {
    $placeholders = implode(',', array_fill(0, count($studentIds), '?'));
    $sqlSessions .= " AND s.ID IN ($placeholders) ";
  }

  $sqlSessions .= " ORDER BY s.last, s.first ";

  $stmt = $conn->prepare($sqlSessions);
  if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

  if (count($studentIds)) {
    $types = 's' . str_repeat('i', count($studentIds));
    $params = array_merge([$date], $studentIds);
    $bind = [];
    $bind[] = $types;
    foreach ($params as $k => $v) {
      $bind[] = &$params[$k];
    }
    call_user_func_array([$stmt, 'bind_param'], $bind);
  } else {
    $stmt->bind_param("s", $date);
  }

  if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);

  $res = $stmt->get_result();
  $sessions = [];
  while ($row = $res->fetch_assoc()) $sessions[] = $row;

  if (!count($sessions)) {
    echo json_encode(["ok" => true, "count" => 0, "html" => ""]);
    exit;
  }

  // Pull marks per session
  $sqlMarks = "
    SELECT
      bm.behavior_id,
      b.behavior_text,
      bm.period,
      bm.value
    FROM behavior_marks bm
    JOIN behaviors b ON b.behavior_id = bm.behavior_id
    WHERE bm.session_id = ?
  ";
  $stmtMarks = $conn->prepare($sqlMarks);
  if (!$stmtMarks) throw new Exception("Prepare failed: " . $conn->error);

  $out = "";
  $count = 0;

  foreach ($sessions as $s) {
    $count++;
    $session_id = (int)$s["session_id"];
    $studentName = htmlspecialchars($s["last"] . ", " . $s["first"]);
    $comments = htmlspecialchars((string)($s["comments"] ?? ""));

    $stmtMarks->bind_param("i", $session_id);
    if (!$stmtMarks->execute()) throw new Exception("Execute failed: " . $stmtMarks->error);

    $mres = $stmtMarks->get_result();

    // behavior_id => behavior_text
    $behaviors = [];
    // behavior_id => period(1..10) => 0/1
    $map = [];

    while ($m = $mres->fetch_assoc()) {
      $bid = (int)$m["behavior_id"];
      $btxt = (string)$m["behavior_text"];
      $period = (int)$m["period"]; // 1..10
      $val = (int)($m["value"] ?? 0);

      $behaviors[$bid] = $btxt;
      if (!isset($map[$bid])) $map[$bid] = [];
      if ($period >= 1 && $period <= 10) {
        $map[$bid][$period] = $val ? 1 : 0;
      }
    }

    // Sort behaviors A-Z
    uasort($behaviors, fn($a, $b) => strcasecmp($a, $b));

    // ---- compute totals like student.js ----
    $colTotals = array_fill(1, 10, ["checked" => 0, "total" => 0]);
    $allChecked = 0;
    $allTotal = 0;

    foreach ($behaviors as $bid => $_) {
      for ($p = 1; $p <= 10; $p++) {
        $colTotals[$p]["total"]++;
        $allTotal++;

        $isChecked = !empty($map[$bid][$p]) ? 1 : 0;
        if ($isChecked) {
          $colTotals[$p]["checked"]++;
          $allChecked++;
        }
      }
    }

    $overallPct = $allTotal ? round(($allChecked / $allTotal) * 100) : 0;

    // ---- Render one sheet using student.php structure/classes ----
    $out .= "<div class='rps-sheet' data-student-id='" . (int)$s["student_id"] . "'>";
    $out .= "<div class='student-form'>";

    $out .= "<h2>Daily Point Sheet</h2>";

    // Header (simple, black/white friendly)
    $out .= "<div style='display:flex;justify-content:flex-end;align-items:flex-start;margin-bottom:8px;'>";
    $out .= "<div style='text-align:right;font-size:12px;line-height:1.35;'>";
    $out .= "<div><strong>Student:</strong> {$studentName}</div>";
    $out .= "<div><strong>Date:</strong> " . htmlspecialchars($printDate) . "</div>";
    $out .= "</div></div>";

    // Table
    $out .= "<div class='behavior-table'>";
    $out .= "<table>";

    $out .= "<thead><tr>";
    $out .= "<th>Observed Behavior</th>";
    $labels = [1=>"1st",2=>"2nd",3=>"3rd",4=>"4th",5=>"5th",6=>"6th",7=>"7th",8=>"8th",9=>"9th",10=>"Bus"];
    for ($p = 1; $p <= 10; $p++) {
      $out .= "<th class='period-toggle'>" . htmlspecialchars($labels[$p]) . "</th>";
    }
    $out .= "<th class='total-col'>Total %</th>";
    $out .= "</tr></thead>";

    $out .= "<tbody>";
    foreach ($behaviors as $bid => $btxt) {
      $out .= "<tr>";
      $out .= "<td>" . htmlspecialchars($btxt) . "</td>";

      $rowChecked = 0;
      $rowTotal = 0;

      for ($p = 1; $p <= 10; $p++) {
        $rowTotal++;
        $checkedAttr = !empty($map[$bid][$p]) ? "checked" : "";
        if ($checkedAttr) $rowChecked++;

        $out .= "<td style='text-align:center;'>";
        $out .= "<input type='checkbox' class='period-check' {$checkedAttr} disabled>";
        $out .= "</td>";
      }

      $rowPct = $rowTotal ? round(($rowChecked / $rowTotal) * 100) : 0;
      $out .= "<td class='row-total' style='text-align:center;font-weight:800;'>" . $rowPct . "%</td>";
      $out .= "</tr>";
    }
    $out .= "</tbody>";

    // Totals row
    $out .= "<tfoot><tr class='totals-row'>";
    $out .= "<td class='totals-label'><strong>Total %</strong></td>";
    for ($p = 1; $p <= 10; $p++) {
      $pct = $colTotals[$p]["total"] ? round(($colTotals[$p]["checked"] / $colTotals[$p]["total"]) * 100) : 0;
      $out .= "<td class='total-cell' style='text-align:center;font-weight:800;'>" . $pct . "%</td>";
    }
    $out .= "<td class='overall-cell' style='text-align:center;font-weight:900;'>" . $overallPct . "%</td>";
    $out .= "</tr></tfoot>";

    $out .= "</table>";
    $out .= "</div>"; // behavior-table

    // Overall
    $out .= "<div class='total-percentage'>";
    $out .= "<strong>Total Percentage:</strong> <span>" . $overallPct . "%</span>";
    $out .= "</div>";

    // Comments (taller)
    $out .= "<div class='form-comments'>";
    $out .= "<label><strong>Comments:</strong></label>";
    $out .= "<textarea rows='11' readonly>" . $comments . "</textarea>";
    $out .= "</div>";

    // ✅ Parent signature block (OUTSIDE the table so it can’t break layout)
    $out .= "<div class='signature-block signature-right'>";
$out .= "  <div class='sig-line'>";
$out .= "    <span class='sig-label'>Parent/Guardian Signature:</span>";
$out .= "    <span class='sig-blank'></span>";
$out .= "  </div>";
$out .= "</div>";

    $out .= "</div>"; // student-form
    $out .= "</div>"; // rps-sheet
  }

  echo json_encode(["ok" => true, "count" => $count, "html" => $out]);

} catch (Exception $e) {
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}