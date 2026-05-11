---
name: hello
description: Trivial skill so the heartbeat-demo plugin has something to install. Has no functional purpose; the spike is about the SessionStart hook, not this skill.
user-invocable: true
---

# Hello

This is a placeholder skill for the deployment-heartbeat spike. Invoking it just prints a greeting — its only purpose is to give the plugin a non-empty payload so that `/plugin install heartbeat-demo@<marketplace>` has a reason to land.

If you invoked this skill expecting telemetry to fire, note: telemetry in this spike fires on `SessionStart`, not on skill invocation. Check `tmp/hackathon/spike-deployment-heartbeat/receiver-log.jsonl` instead.
