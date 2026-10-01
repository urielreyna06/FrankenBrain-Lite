#!/usr/bin/env bash
# Reads analyzer output on stdin; exits 0 only when the completion record
# {"status":"analysis_complete"} appears exactly once as the last non-empty
# line. A single closing markdown fence after it is tolerated, because models
# often wrap the record in ```json ... ```.
awk '
  { sub(/\r$/, "", $0) }
  $0 == "{\"status\":\"analysis_complete\"}" { count++ }
  NF { prev = last; last = $0 }
  END {
    rec = "{\"status\":\"analysis_complete\"}"
    ok = (last == rec) || (last ~ /^```[ \t]*$/ && prev == rec)
    exit !(count == 1 && ok)
  }
'
