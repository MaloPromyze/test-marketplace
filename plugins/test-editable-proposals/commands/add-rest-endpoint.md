---
description: Add REST endpoint
---

Creates a new REST endpoint following the hexagonal architecture pattern with proper validation and error handling.

## When to Use

- When adding a new API endpoint to the application
- When exposing a new use case through the REST interface

## Context Validation Checkpoints

* [ ] Is the HTTP method and route path defined?
* [ ] Is the request/response DTO specified?
* [ ] Does the corresponding use case exist?

## Command Steps

### Step 1: Create the controller

Create a new controller class with the route handler, request validation, and response mapping.

### Step 2: Register the route

Add the new route to the router module and configure middleware.

### Step 3: Add integration tests

Write integration tests covering happy path, validation errors, and authorization.
