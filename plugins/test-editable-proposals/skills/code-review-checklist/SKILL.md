---
name: code-review-checklist
description: Guide developers through a structured and thorough code review process covering correctness, readability, security, and performance to ensure consistent high-quality reviews.
---

# Code Review Assistant

## Overview

Use this skill when performing code reviews to ensure no important aspect is missed. It provides a structured and comprehensive approach to reviewing pull requests with security awareness.

## Steps

### 1. Correctness Check

Verify that the code does what it claims to do:
- Does it handle edge cases?
- Are error paths covered?
- Are there off-by-one errors?

### 2. Readability Check

Ensure the code is easy to understand:
- Are variable names descriptive?
- Is the control flow straightforward?
- Are complex sections commented?

### 3. Performance Check

Look for potential performance issues:
- Are there unnecessary loops or allocations?
- Could any operation be batched?
- Are database queries efficient?