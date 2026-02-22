<?php
// pages/calendar.php
?>

<div class="cal-page">
  <div class="cal-header">
    <h2>School Calendar</h2>
  </div>

  <div class="cal-toolbar">
    <div class="cal-tool">
      <label for="schoolYearSelect">School Year:</label>
      <select id="schoolYearSelect"></select>
    </div>

    <div class="cal-actions">
      <button id="btnSaveCalendar" class="btn-primary">Save</button>
      <span id="calSavedToast" class="cal-toast" aria-live="polite"></span>
    </div>
  </div>

  <div class="cal-legend">
    <span class="legend-item"><span class="swatch weekend"></span> Weekend</span>
    <span class="legend-item"><span class="swatch noschool"></span> No School</span>
    <span class="legend-item"><span class="swatch normal"></span> School Day</span>
  </div>

  <div id="calendarGrid" class="cal-grid" aria-label="Calendar Grid"></div>
</div>
