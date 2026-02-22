<?php
// seed_dummy_data.php
// WARNING: This will DELETE ALL DATA in your Centralia DB tables and reseed them with dummy data.
// Put this in your project root (next to config/), run it once in browser, then DELETE it.

set_time_limit(0);
ini_set("memory_limit", "1024M");

require_once __DIR__ . "/config/db.php"; // uses $conn (mysqli)

header("Content-Type: text/plain; charset=utf-8");

function out($s) {
  echo $s . "\n";
  @ob_flush();
  @flush();
}

function rand_pick($arr) { return $arr[array_rand($arr)]; }
function rand_float() { return mt_rand() / mt_getrandmax(); }
function rand_bool($pTrue) { return rand_float() < $pTrue; }
function ymd(DateTime $d) { return $d->format("Y-m-d"); }

function isWeekend(DateTime $d) {
  $n = (int)$d->format("N"); // 6=Sat, 7=Sun
  return $n >= 6;
}

function q(mysqli $conn, $sql) {
  if (!$conn->query($sql)) {
    throw new Exception("SQL error: {$conn->error}\nSQL: $sql");
  }
}

function table_exists(mysqli $conn, $table) {
  $t = $conn->real_escape_string($table);
  $res = $conn->query("SHOW TABLES LIKE '$t'");
  $ok = $res && $res->num_rows > 0;
  if ($res) $res->free();
  return $ok;
}

function get_columns(mysqli $conn, $table) {
  $cols = [];
  $res = $conn->query("SHOW COLUMNS FROM `$table`");
  if (!$res) return $cols;
  while ($r = $res->fetch_assoc()) $cols[] = $r["Field"];
  $res->free();
  return $cols;
}

function has_col($cols, $name) { return in_array($name, $cols, true); }

// ---------------- SETTINGS ----------------
$NUM_STUDENTS = 100;  // includes Eric Combs
$NUM_USERS    = 50;
$NUM_ADMINS   = 5;

$DEFAULT_BEHAVIOR_COUNT = 10; // only 10 defaults
$ASSIGN_MIN = 8;
$ASSIGN_MAX = 10;

// absences
$ABSENCE_PROB = 0.07;         // ~7% chance per school day
$ABSENCE_STREAK_PROB = 0.30;  // if absent today, chance absent tomorrow too

// good-check rate per student
$CHECK_PROB_MIN = 0.70;
$CHECK_PROB_MAX = 0.95;

// periods are 1..10 (Bus is 10)
$PERIODS = range(1, 10);

// Behaviors: first 10 are default
$BEHAVIORS = [
  "Attempt work / pay attention",
  "Brings iPad to class",
  "Follow instructions",
  "Is respectful to teacher",
  "Physically appropriate with objects",
  "Physically appropriate with peers",
  "Physically appropriate with staff",
  "Prepared for class / homework",
  "Raise hand to speak",
  "Remain in area",

  // non-default extras (won't be auto-assigned)
  "Remembers to bring pencil",
  "Verbally appropriate with peers",
  "Verbally appropriate with staff",
  "Uses appropriate language",
  "Keeps hands to self",
];

// Name pools
$firstNames = [
  "Aiden","Ava","Benjamin","Carter","Charlotte","Chloe","Daniel","Eleanor","Elijah","Ella",
  "Emma","Evelyn","Gabriel","Grace","Grayson","Hannah","Harper","Henry","Isabella","Jackson",
  "James","Julian","Liam","Lily","Lucas","Mateo","Mia","Noah","Olivia","Oliver",
  "Riley","Scarlett","Sophia","Theodore","Victoria","Wyatt","Zoey","Logan","Amelia","Levi",
  "Addison","Caleb","Nora","Stella","Isaac","Owen","Layla","Aria","Mason","Leo"
];

$lastNames = [
  "Allen","Anderson","Brown","Clark","Davis","Flores","Garcia","Gonzalez","Harris","Hill",
  "Jackson","Johnson","Jones","King","Lee","Lewis","Lopez","Martin","Martinez","Miller",
  "Moore","Nguyen","Perez","Ramirez","Robinson","Rodriguez","Sanchez","Scott","Smith","Taylor",
  "Thomas","Thompson","Torres","Walker","White","Williams","Wilson","Wright","Young","Hernandez"
];

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    die("❌ No mysqli connection found in \$conn. Check config/db.php\n");
  }
  $conn->set_charset("utf8mb4");

  // ---------------- SCHOOL YEAR WINDOW ----------------
  $tz = new DateTimeZone("America/Chicago");
  $today = new DateTime("now", $tz);

  $year = (int)$today->format("Y");
  $month = (int)$today->format("n");
  $startYear = ($month < 8) ? ($year - 1) : $year;

  $schoolStart = new DateTime("$startYear-08-01", $tz);
  $schoolEnd   = clone $today;

  out("== Centralia Seeder starting ==");
  out("School year range: " . ymd($schoolStart) . " -> " . ymd($schoolEnd));
  out("");

  // ---------------- 0) TABLE CHECKS ----------------
  $required = ["student","users","behaviors","student_behavior_assignments","behavior_sessions","behavior_marks"];
  foreach ($required as $t) {
    if (!table_exists($conn, $t)) {
      throw new Exception("Missing required table: $t");
    }
  }

  $colsStudents = get_columns($conn, "student");
  $colsUsers    = get_columns($conn, "users");
  $colsBeh      = get_columns($conn, "behaviors");
  $colsAsn      = get_columns($conn, "student_behavior_assignments");
  $colsSess     = get_columns($conn, "behavior_sessions");
  $colsMarks    = get_columns($conn, "behavior_marks");

  $hasCalendar  = table_exists($conn, "school_calendar_days");
  $colsCal      = $hasCalendar ? get_columns($conn, "school_calendar_days") : [];

  foreach (["first","last"] as $c) {
    if (!has_col($colsStudents, $c)) throw new Exception("student table missing column: $c");
  }
  if (!has_col($colsStudents, "ID") && !has_col($colsStudents, "id")) {
    throw new Exception("student table missing primary key column ID/id");
  }

  foreach (["behavior_text","is_default","is_active"] as $c) {
    if (!has_col($colsBeh, $c)) throw new Exception("behaviors table missing $c");
  }

  foreach (["student_id","session_date"] as $c) {
    if (!has_col($colsSess, $c)) throw new Exception("behavior_sessions missing $c");
  }
  if (!has_col($colsSess, "session_id") && !has_col($colsSess, "id")) {
    throw new Exception("behavior_sessions missing session_id/id");
  }

  foreach (["session_id","behavior_id","period","value"] as $c) {
    if (!has_col($colsMarks, $c)) throw new Exception("behavior_marks missing $c");
  }

  // ---------------- 1) CLEAR ALL DATA ----------------
  out("Disabling FK checks...");
  q($conn, "SET FOREIGN_KEY_CHECKS=0");

  $truncate = [
    "behavior_marks",
    "behavior_sessions",
    "student_behavior_assignments",
    "school_calendar_days",
    "behaviors",
    "student",
    "users",
  ];

  foreach ($truncate as $t) {
    if ($t === "school_calendar_days" && !$hasCalendar) continue;
    out("TRUNCATE `$t`...");
    q($conn, "TRUNCATE TABLE `$t`");
  }

  out("Enabling FK checks...");
  q($conn, "SET FOREIGN_KEY_CHECKS=1");
  out("");

  // ---------------- 2) SEED BEHAVIORS ----------------
  out("Inserting behaviors (10 default + extras)...");

  $stmtBeh = $conn->prepare("INSERT INTO behaviors (behavior_text, is_active, is_default) VALUES (?, 1, ?)");
  if (!$stmtBeh) throw new Exception("Prepare failed (behaviors): " . $conn->error);

  foreach ($BEHAVIORS as $i => $txt) {
    $isDefault = ($i < $DEFAULT_BEHAVIOR_COUNT) ? 1 : 0;
    $stmtBeh->bind_param("si", $txt, $isDefault);
    $stmtBeh->execute();
  }
  $stmtBeh->close();

  $defaultIds = [];
  $res = $conn->query("SELECT behavior_id FROM behaviors WHERE is_default=1 ORDER BY behavior_id ASC");
  while ($row = $res->fetch_assoc()) $defaultIds[] = (int)$row["behavior_id"];
  $res->free();

  if (count($defaultIds) !== $DEFAULT_BEHAVIOR_COUNT) {
    throw new Exception("Expected $DEFAULT_BEHAVIOR_COUNT default behaviors, got " . count($defaultIds));
  }

  out("Default behavior IDs: " . implode(",", $defaultIds));
  out("");

  // ---------------- 3) SEED STUDENTS (INCLUDE ERIC COMBS) ----------------
  out("Inserting {$NUM_STUDENTS} students (including Eric Combs)...");

  $hasGrade  = has_col($colsStudents, "grade");
  $hasStatus = has_col($colsStudents, "status");
  $pkStudent = has_col($colsStudents, "ID") ? "ID" : "id";

  if ($hasGrade && $hasStatus) {
    $stmtStu = $conn->prepare("INSERT INTO student (first,last,grade,status) VALUES (?,?,?,1)");
  } else if ($hasGrade && !$hasStatus) {
    $stmtStu = $conn->prepare("INSERT INTO student (first,last,grade) VALUES (?,?,?)");
  } else if (!$hasGrade && $hasStatus) {
    $stmtStu = $conn->prepare("INSERT INTO student (first,last,status) VALUES (?,?,1)");
  } else {
    $stmtStu = $conn->prepare("INSERT INTO student (first,last) VALUES (?,?)");
  }
  if (!$stmtStu) throw new Exception("Prepare failed (student): " . $conn->error);

  // Eric first
  $first = "Eric"; $last = "Combs"; $grade = 11;
  if ($hasGrade && $hasStatus) {
    $stmtStu->bind_param("ssi", $first, $last, $grade);
  } else if ($hasGrade && !$hasStatus) {
    $stmtStu->bind_param("ssi", $first, $last, $grade);
  } else {
    $stmtStu->bind_param("ss", $first, $last);
  }
  $stmtStu->execute();

  $used = ["Eric|Combs" => true];
  for ($i = 1; $i < $NUM_STUDENTS; $i++) {
    do {
      $first = rand_pick($firstNames);
      $last  = rand_pick($lastNames);
      if (mt_rand(1,100) <= 8) $last .= "-" . rand_pick($lastNames);
      $key = "$first|$last";
    } while (isset($used[$key]));
    $used[$key] = true;

    $grade = mt_rand(9, 12);

    if ($hasGrade && $hasStatus) {
      $stmtStu->bind_param("ssi", $first, $last, $grade);
    } else if ($hasGrade && !$hasStatus) {
      $stmtStu->bind_param("ssi", $first, $last, $grade);
    } else {
      $stmtStu->bind_param("ss", $first, $last);
    }
    $stmtStu->execute();
  }
  $stmtStu->close();

  $studentIds = [];
  $res = $conn->query("SELECT `$pkStudent` AS sid FROM student ORDER BY `$pkStudent`");
  while ($row = $res->fetch_assoc()) $studentIds[] = (int)$row["sid"];
  $res->free();

  out("Students inserted: " . count($studentIds));
  out("");

  // ---------------- 4) SEED USERS ----------------
  out("Inserting {$NUM_USERS} staff users ({$NUM_ADMINS} admin)...");

  foreach (["email","first","last","password_hash","role"] as $c) {
    if (!has_col($colsUsers, $c)) throw new Exception("users table missing $c");
  }

  $hash = password_hash("password", PASSWORD_BCRYPT);

  $stmtUsr = $conn->prepare("INSERT INTO users (email, first, last, password_hash, role) VALUES (?,?,?,?,?)");
  if (!$stmtUsr) throw new Exception("Prepare failed (users): " . $conn->error);

  $usedEmail = [];
  for ($i = 1; $i <= $NUM_USERS; $i++) {
    $uf = rand_pick($firstNames);
    $ul = rand_pick($lastNames);
    $email = strtolower($uf . "." . preg_replace("/[^a-z]/i", "", $ul) . $i . "@school.local");
    if (isset($usedEmail[$email])) { $i--; continue; }
    $usedEmail[$email] = true;

    $role = ($i <= $NUM_ADMINS) ? "Admin" : "Teacher";
    $stmtUsr->bind_param("sssss", $email, $uf, $ul, $hash, $role);
    $stmtUsr->execute();
  }
  $stmtUsr->close();

  out("Users inserted. (All passwords = 'password')");
  out("");

  // ---------------- 5) POPULATE school_calendar_days (optional) ----------------
  if ($hasCalendar) {
    out("Populating school_calendar_days (weekends no_school=1, plus a few breaks)...");

    if (!has_col($colsCal, "calendar_date") || !has_col($colsCal, "no_school")) {
      out("⚠️ school_calendar_days exists but missing calendar_date/no_school; skipping calendar population.");
    } else {
      $hasNote = has_col($colsCal, "note");

      if ($hasNote) {
        $stmtCal = $conn->prepare("INSERT INTO school_calendar_days (calendar_date, no_school, note) VALUES (?,?,?)");
      } else {
        $stmtCal = $conn->prepare("INSERT INTO school_calendar_days (calendar_date, no_school) VALUES (?,?)");
      }
      if (!$stmtCal) throw new Exception("Prepare failed (calendar): " . $conn->error);

      $noSchool = [];

      $d1 = new DateTime("$startYear-12-20", $tz);
      $d2 = new DateTime(($startYear+1)."-01-03", $tz);
      for ($d = clone $d1; $d <= $d2; $d->modify("+1 day")) $noSchool[$d->format("Y-m-d")] = "Winter Break";

      $thanks = new DateTime("$startYear-11-01", $tz);
      $thanks->modify("fourth thursday of november");
      $noSchool[$thanks->format("Y-m-d")] = "Thanksgiving";
      $noSchool[(clone $thanks)->modify("+1 day")->format("Y-m-d")] = "Thanksgiving";

      for ($k=0; $k<2; $k++) {
        $rd = (clone $schoolStart)->modify("+".mt_rand(10, 140)." days");
        if (!isWeekend($rd)) $noSchool[$rd->format("Y-m-d")] = "Inservice";
      }

      $day = clone $schoolStart;
      while ($day <= $schoolEnd) {
        $ds = ymd($day);
        $no = 0;
        $note = null;

        if (isWeekend($day)) { $no = 1; $note = "Weekend"; }
        if (isset($noSchool[$ds])) { $no = 1; $note = $noSchool[$ds]; }

        if ($hasNote) {
          $stmtCal->bind_param("sis", $ds, $no, $note);
        } else {
          $stmtCal->bind_param("si", $ds, $no);
        }
        $stmtCal->execute();
        $day->modify("+1 day");
      }

      $stmtCal->close();
      out("school_calendar_days populated.");
    }

    out("");
  }

  // ---------------- 6) ASSIGN 8–10 DEFAULT BEHAVIORS PER STUDENT ----------------
  out("Assigning 8–10 default behaviors per student...");

  $hasStartEnd = has_col($colsAsn, "start_date") && has_col($colsAsn, "end_date");
  $assignStart = ymd($schoolStart);

  if ($hasStartEnd) {
    $stmtAsn = $conn->prepare("
      INSERT INTO student_behavior_assignments (student_id, behavior_id, start_date, end_date)
      VALUES (?, ?, ?, NULL)
    ");
  } else {
    $stmtAsn = $conn->prepare("
      INSERT INTO student_behavior_assignments (student_id, behavior_id)
      VALUES (?, ?)
    ");
  }
  if (!$stmtAsn) throw new Exception("Prepare failed (assignments): " . $conn->error);

  foreach ($studentIds as $sid) {
    $k = mt_rand($ASSIGN_MIN, $ASSIGN_MAX);
    $pool = $defaultIds;
    shuffle($pool);
    $picked = array_slice($pool, 0, $k);

    // extra safety: enforce uniqueness
    $picked = array_values(array_unique($picked));

    foreach ($picked as $bid) {
      if ($hasStartEnd) {
        $stmtAsn->bind_param("iis", $sid, $bid, $assignStart);
      } else {
        $stmtAsn->bind_param("ii", $sid, $bid);
      }
      $stmtAsn->execute();
    }
  }
  $stmtAsn->close();

  out("Assignments inserted.");
  out("");

  // ---------------- 7) LOAD ASSIGNMENTS (DISTINCT + UNIQUE) ----------------
  $assignments = []; // sid => [behavior_id...]
  $res = $conn->query("SELECT DISTINCT student_id, behavior_id FROM student_behavior_assignments");
  while ($row = $res->fetch_assoc()) {
    $sid = (int)$row["student_id"];
    $bid = (int)$row["behavior_id"];
    if (!isset($assignments[$sid])) $assignments[$sid] = [];
    $assignments[$sid][] = $bid;
  }
  $res->free();

  // make sure each student list is unique (protects against accidental duplicates in table)
  foreach ($assignments as $sid => $list) {
    $assignments[$sid] = array_values(array_unique($list));
  }

  // ---------------- 8) GENERATE SESSIONS + MARKS ----------------
  out("Generating behavior_sessions + behavior_marks for weekdays (random absences)...");
  out("This may take a bit (lots of rows).");

  $stmtSess = $conn->prepare("
    INSERT INTO behavior_sessions (student_id, session_date, comments)
    VALUES (?, ?, ?)
  ");
  if (!$stmtSess) throw new Exception("Prepare failed (sessions): " . $conn->error);

  $qualityByStudent = [];
  $absentStreak = [];
  foreach ($studentIds as $sid) {
    $qualityByStudent[$sid] = $CHECK_PROB_MIN + rand_float() * ($CHECK_PROB_MAX - $CHECK_PROB_MIN);
    $absentStreak[$sid] = 0;
  }

  $totalSessions = 0;
  $totalMarks = 0;
  $dayCount = 0;

  $conn->begin_transaction();

  $day = clone $schoolStart;
  while ($day <= $schoolEnd) {
    if (isWeekend($day)) { $day->modify("+1 day"); continue; }

    $dateStr = ymd($day);
    $dayCount++;

    foreach ($studentIds as $sid) {
      if ($absentStreak[$sid] > 0) { $absentStreak[$sid]--; continue; }

      if (rand_bool($ABSENCE_PROB)) {
        if (rand_bool($ABSENCE_STREAK_PROB)) $absentStreak[$sid] = 1;
        continue;
      }

      $comment = null;
      $r = mt_rand(1,100);
      if ($r <= 3) $comment = "Great day.";
      else if ($r <= 6) $comment = "Needed reminders.";
      else if ($r <= 7) $comment = "Had difficulty in one period.";

      $stmtSess->bind_param("iss", $sid, $dateStr, $comment);
      $stmtSess->execute();
      $sessionId = (int)$conn->insert_id;
      $totalSessions++;

      $bids = $assignments[$sid] ?? [];
      if (!$bids) continue;

      // absolute safety: unique list for this session
      $bids = array_values(array_unique($bids));

      $checkProb = $qualityByStudent[$sid];

      $values = [];
      foreach ($bids as $bid) {
        foreach ($PERIODS as $p) {
          if (rand_bool(0.07)) {
            $val = "NULL";
          } else {
            $pProb = $checkProb - (($p === 10) ? 0.03 : 0.00);
            if ($pProb < 0.05) $pProb = 0.05;
            if ($pProb > 0.98) $pProb = 0.98;
            $val = rand_bool($pProb) ? "1" : "0";
          }
          $values[] = "(" . (int)$sessionId . "," . (int)$bid . "," . (int)$p . "," . $val . ")";
        }
      }

      if ($values) {
        // ✅ idempotent insert (never fails on duplicates)
        $sql = "INSERT INTO behavior_marks (session_id, behavior_id, period, value) VALUES "
          . implode(",", $values)
          . " ON DUPLICATE KEY UPDATE value = VALUES(value)";
        if (!$conn->query($sql)) {
          throw new Exception("Marks insert failed: {$conn->error}\nExample SQL: " . substr($sql, 0, 300));
        }
        $totalMarks += count($values);
      }

      if (($totalSessions % 250) === 0) {
        $conn->commit();
        $conn->begin_transaction();
      }
    }

    if (($dayCount % 10) === 0) {
      out("... processed ~{$dayCount} weekdays (sessions={$totalSessions}, marks={$totalMarks})");
    }

    $day->modify("+1 day");
  }

  $conn->commit();
  $stmtSess->close();

  out("");
  out("✅ DONE.");
  out("Total sessions created: $totalSessions");
  out("Total marks attempted:  $totalMarks");
  out("");
  out("IMPORTANT: Delete seed_dummy_data.php after you run it.");

} catch (Throwable $e) {
  out("");
  out("ERROR: " . $e->getMessage());
}

