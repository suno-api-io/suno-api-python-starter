# Security Policy

## Do not publish secrets

Never open an issue or pull request containing any of the following:

- API keys;
- cookies;
- account credentials;
- generated media containing private information;
- full request headers containing authorization data.

If a key may have been exposed, revoke or rotate it from the account console
immediately. Removing a public message is not enough because the value may
already be cached or copied.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue.

Use the repository's **Security > Report a vulnerability** flow when it is
available. If private reporting is unavailable, contact the support channel
listed on the service website and include only:

- a short description;
- reproducible steps with secrets removed;
- the affected date and endpoint;
- an HTTP request ID, if present.

Never include a real API key or user data in the report.

