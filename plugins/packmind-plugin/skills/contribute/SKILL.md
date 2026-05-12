---
name: Contribute to Packmind Skills
description: Use this skill whenever the user wants to fix, improve, edit, update, change, refine, or contribute changes to a skill that was installed from a Packmind marketplace. Triggers on phrases like "fix this skill", "this skill is broken", "improve this skill", "the SKILL.md needs updating", "contribute back to Packmind", or any intent to modify a Packmind-distributed skill. Walks the user through cloning the live source of the skill into the project's `.claude/skills/<slug>/` directory, iterating on it with /reload-plugins, then submitting the diff back to Packmind as a change proposal — all without leaving Claude Code.
---

# Contribute to Packmind Skills

A developer using a Packmind-distributed plugin has noticed a skill is broken, incomplete, or could be improved. This skill walks them through proposing a fix back to Packmind.

The flow uses the existing `packmind-cli` (already installed and authenticated on the developer's machine — required) and the existing Packmind change-proposals queue. No PRs, no extra tooling.

## When to invoke this skill

Invoke this skill whenever the user expresses an intent like:

- "This skill is broken, can you fix it?"
- "The SKILL.md for <slug> says X but it should say Y"
- "Improve the <slug> skill"
- "I want to contribute this fix back to Packmind"
- "Update the prompt for the <slug> skill"

If you can identify the slug of a Packmind-installed skill from the conversation, use it. Otherwise, ask the user which skill they want to edit.

## The flow

For a target skill with slug `<skill-slug>`, run these steps in order. Do NOT skip steps.

### 1. Clone the live source into the project's skills directory

```bash
packmind-cli playbook clone <skill-slug> --output .claude/skills/<skill-slug>
```

This fetches the latest version of the skill from Packmind and writes its contents — `SKILL.md` plus any supporting files — directly into `.claude/skills/<skill-slug>/` in the developer's project. Claude Code picks the skill up from there automatically.

After cloning, tell the developer to run `/reload-plugins` in their Claude Code session so the edited skill is reloaded as they iterate.

### 2. Edit the skill

Help the developer edit the files in `.claude/skills/<skill-slug>/`. The frontmatter is at the top of `SKILL.md`. The prompt body is below the frontmatter. Supporting files live alongside the SKILL.md.

Tell them to use `/reload-plugins` (Claude Code) after each edit to validate the change in-session.

### 3. Stage the diff

Once the developer is satisfied:

```bash
packmind-cli playbook add .claude/skills/<skill-slug>
```

This computes the diff against the cloned version and stages each change as a pending entry in the local `playbook.yaml`.

The developer can inspect with:

```bash
packmind-cli playbook status
packmind-cli playbook diff
```

### 4. Submit the diff back to Packmind

```bash
packmind-cli playbook submit -m "<short description of the fix>"
```

This POSTs a batch of change proposals to Packmind. They will appear in the existing admin review queue. On approval, the marketplace auto-redeploys and every consumer's Claude Code receives the fix on next session via the marketplace auto-update.

### 5. Clean up the local sandbox

```bash
packmind-cli playbook clean <skill-slug> --output .claude/skills/<skill-slug>
```

This deletes `.claude/skills/<skill-slug>/` and clears any staged entries scoped to it from `playbook.yaml`. The developer's project returns to the pre-edit state.

## Notes

- The developer must already be authenticated to Packmind (`PACKMIND_API_KEY_V3` set, or logged in via `packmind-cli login`). If not, surface the auth error from the CLI and ask them to log in.
- If the developer aborts mid-flow, step 5 (`clean`) is still safe to run and is idempotent.
- The space slug is auto-resolved from the local `packmind.json` sidecar that ships with this plugin. If the developer cloned the skill outside of an installed-marketplace directory, ask them to pass `--space <slug>`.
- If the developer prefers a throwaway location instead of `.claude/skills/<skill-slug>/` (for example to keep the edit out of git), they can pass any `--output <dir>` they want — but they then lose live Claude Code discovery for that copy.
