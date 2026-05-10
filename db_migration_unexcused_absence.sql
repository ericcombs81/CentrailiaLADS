ALTER TABLE `behavior_sessions`
  ADD COLUMN `unexcused_absence` tinyint(1) NOT NULL DEFAULT 0 AFTER `present_mask`;
