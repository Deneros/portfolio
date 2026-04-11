---

title: AuditGlow
description: Mobile audit app with photo documentation, roles, and cloud reports.
longDescription: |
  Cross-platform mobile application for facility audits. Allows documenting
  conditions with before/after photos, assigning roles (auditor, supervisor, client),
  evaluating areas with configurable forms, and generating automatic exportable reports.
status: design
statusLabel: Design Phase
stack:
  - Expo
  - React Native
  - React 19
  - Expo Router
  - Camera API
  - Secure Store
tags:
  - Mobile
  - React Native
image: /screenshots/auditglow-dashboard.jpg
gallery:
  - /screenshots/auditglow-dashboard.jpg
  - /screenshots/auditglow-login.jpg
  - /screenshots/auditglow-audits.jpg
  - /screenshots/auditglow-areas.jpg
  - /screenshots/auditglow-join.jpg
galleryLayout: mobile
featured: false
order: 7
lang: en
slug: auditglow
---


## The Problem

Facility audit processes are done with paper forms or generic tools. An app is needed
that allows documenting conditions with photos/video, assigning roles, and generating
automatic reports.

## My Approach

- **Expo + React Native**: Cross-platform development (iOS, Android, Web) from a
  single codebase.
- **Visual documentation**: Before/after photo capture using the native camera,
  cloud storage.
- **Roles**: Auditor, supervisor, client, and employee with differentiated permissions.
- **Expo Router**: File-based navigation similar to Next.js.

### Designed Functional Areas

1. Audit management and scheduling
2. Photo/video evidence capture
3. Area evaluation forms
4. Reports and export
5. User and role management
6. Metrics dashboard

## Current Status

Design phase completed with detailed requirements document and defined architecture.
Stack selected and navigation structure implemented.
