---

title: IRIX
description: B2B email client with AI-powered phishing detection, auto-replies, push notifications, and email classification by importance.
longDescription: |
  Enterprise email client that analyzes emails in real time to detect phishing,
  automatically classifies by importance tiers, generates suggested auto-replies,
  and sends push notifications for critical emails. Syncs with Gmail and
  Outlook via OAuth/MSAL.
status: mvp
statusLabel: MVP
stack:
  - Fastify
  - TypeScript
  - Prisma
  - PostgreSQL
  - Redis
  - Next.js 14
  - OpenAI
  - JWT
  - MSAL
tags:
  - AI/ML
  - Security
  - Full-Stack
image: /screenshots/irix-inbox.png
gallery:
  - /screenshots/irix-inbox.png
  - /screenshots/irix-welcome.png
featured: true
order: 2
lang: en
slug: irix
---


## The Problem

Traditional email clients don't offer active threat protection or help manage
email volume. Employees waste time manually classifying emails, fall for sophisticated
phishing attempts, and critical emails get buried among newsletters and notifications.

## My Approach

### Backend (Fastify + TypeScript)

- **REST API with Prisma ORM**: Models for users, emails, classification rules,
  and notification settings.
- **JWT authentication with refresh tokens**: Secure sessions with automatic rotation.
- **Multi-provider sync**: MSAL for Office 365/Outlook and OAuth 2.0 for
  Gmail. Emails sync in the background via webhooks.

### AI Pipeline

- **Phishing detection**: Local analysis of headers, links, language patterns,
  and domain reputation. Emails are processed without sending content to external
  services — privacy is a requirement, not a feature.
- **Importance tier classification**: Each email receives a tier (urgent, high,
  normal, low) based on sender, content, interaction history, and user-defined
  custom rules.
- **Suggested auto-replies**: The system generates response drafts for
  frequent emails that the user can edit and send with one click.

### Push Notifications

- Real-time notifications for emails classified as urgent or from priority
  senders. Configurable by tier — the user decides which importance level
  deserves a notification.

### Frontend (Next.js 14)

- Email interface with visual risk indicators (phishing badges with confidence
  level) and color bars by importance tier.
- Configuration panel for classification rules and notification preferences.

### Key Technical Decisions

- **Fastify over Express**: Better performance and native validation schema for an
  API that processes high email volume.
- **Redis for session cache and processing queue**: State synchronization across
  tabs and devices, and queue for the AI analysis pipeline.
- **Local analysis**: Enterprise emails never leave the server. The entire phishing
  and classification pipeline runs on-premise.

## Lessons Learned

- Microsoft Graph API integration requires handling many edge cases in permissions,
  refresh tokens, and subscription webhooks.
- Phishing detection has to balance sensitivity with false positives — too many
  alerts cause users to ignore them. I implemented a feedback system where
  users can flag false positives to train the model.
- Tier classification needs a "learning" period per user before becoming
  useful. The first few days rely on generic rules while accumulating data.
