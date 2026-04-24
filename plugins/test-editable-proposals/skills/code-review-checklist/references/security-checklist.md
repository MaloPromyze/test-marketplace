# Security Review Checklist

Use this reference during the security phase of code reviews.

## Input Validation

- All user inputs are validated and sanitized
- SQL queries use parameterized statements
- File paths are validated against directory traversal

## Authentication & Authorization

- Endpoints enforce proper authentication
- Role-based access controls are verified
- Tokens are validated and not logged

## Data Protection

- Sensitive data is not exposed in logs or error messages
- Secrets are loaded from environment variables, never hardcoded
- PII is handled according to data retention policies
