---

title: MRH Services
description: Home services hiring marketplace with geolocation, state-based certification validation, and task management.
longDescription: |
  Platform that connects customers with home service providers (cleaning,
  electrical, plumbing, handyman). Includes provider and customer geolocation
  with Leaflet, certification validation required by US state,
  scheduling system, and real-time task tracking.
status: mvp
statusLabel: MVP
stack:
  - React 19
  - Vite
  - TailwindCSS
  - Recharts
  - Leaflet
  - Radix UI
  - React Hook Form
tags:
  - Frontend
  - Marketplace
  - Maps
image: /screenshots/mrh-dashboard.png
gallery:
  - /screenshots/mrh-dashboard.png
  - /screenshots/mrh-login.png
  - /screenshots/mrh-task-detail.png
  - /screenshots/mrh-agenda.png
  - /screenshots/mrh-profile.png
  - /screenshots/mrh-account.png
  - /screenshots/mrh-new-task.png
featured: false
order: 8
lang: en
slug: mrh-dashboard
---


## The Problem

In the United States, hiring home services is fragmented: customers search across
multiple platforms, don't know which services require certification in their state,
and have no way to track the progress of hired work.

## My Approach

### Marketplace with Geolocation

- **Leaflet maps**: Visualization of available providers near the customer and
  active task locations. Providers appear with their coverage radius
  and specialties.
- **Search by service and location**: Filters by service type (cleaning,
  electrical, plumbing, handyman, etc.) and maximum distance.

### Certification Validation

- Some services require certification by state (electricians, plumbers,
  HVAC). The system validates that the provider has current certifications to
  operate in the customer's state before allowing the hire.

### Task Management

- **Task creation**: The customer describes the work, selects a category, attaches
  photos, and chooses a preferred date/time.
- **Integrated calendar**: Calendar view for providers with their assigned tasks,
  available hours, and service area.
- **Tracking**: Each task has states (pending, accepted, in progress, completed)
  with notifications at each transition.

### Metrics Dashboard

- **Recharts**: Charts for completed tasks, revenue by period, distribution
  by service type, and average ratings.
- **Provider panel**: Profile with work history, certifications, ratings,
  and editable coverage area on the map.

### Key Technical Decisions

- **Leaflet over Google Maps/Mapbox**: Open source, no per-request costs — critical
  for a marketplace where each search generates multiple map renders.
- **Radix UI**: Accessible headless components for filters, selects, modals, and
  complex task creation forms.
- **React Hook Form + Zod**: Provider registration form validation with
  dynamic fields based on service type and state.

## Lessons Learned

- Certifications vary enormously between states — what doesn't require a
  license in Texas does in California. The rules system has to be configurable per state.
- Maps with many provider markers require clustering to maintain
  performance in dense areas.
- The UX of a two-sided marketplace (customer/provider) requires completely
  different flows for each role.
