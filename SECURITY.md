# Security Policy

## Project status

This repository is a learning and portfolio project and is undergoing an active security refactor. There are currently no formal release branches or versioned releases with a guaranteed security-maintenance window.

The default branch (`main`) is the current development line. It should not be treated as production-ready until the documented security work and integration testing are complete.

## Supported versions

| Version | Security support |
| --- | --- |
| Current `main` branch | Best-effort fixes during active development |
| Tagged releases | No formal release support policy has been established |
| Other branches and forks | Not supported |

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in public issues, discussions, pull requests, or social media.

Use GitHub's **private vulnerability reporting** feature for this repository, if it is enabled:

1. Open the repository on GitHub.
2. Select the **Security** tab.
3. Open **Advisories** and choose **Report a vulnerability**.
4. Include a clear description, affected files or endpoints, reproduction steps, and potential impact.

If private vulnerability reporting is unavailable, contact the repository maintainer privately through a verified GitHub contact method. Do not publish exploit details while seeking a contact.

## What to include

A useful report should contain:

- A concise summary and the affected branch, commit, endpoint, or component.
- The security impact and realistic attack scenario.
- Reproduction steps or a minimal proof of concept.
- Any suggested mitigation, if known.

Please avoid including real user data, credentials, session cookies, API keys, or other secrets in the report. Use synthetic test data.

## Response and disclosure

The maintainer will make a best effort to acknowledge a report within **3 business days** and provide an initial assessment or status update within **7 business days**. These are response goals, not guaranteed service-level commitments.

If the issue is accepted, remediation and a coordinated disclosure timeline will be discussed with the reporter. If it is declined, the reporter will be given a brief explanation where practical.

Please allow a reasonable opportunity to investigate and release a fix before making vulnerability details public.
