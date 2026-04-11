---

title: Val Logistics
description: Order tracking system with integrated chat, operational dashboard, CO2 footprint calculations, and real-time notifications.
longDescription: |
  Enterprise logistics platform for tracking orders end-to-end, with integrated chat
  between operators and customers, operational metrics dashboard, automatic carbon
  footprint calculation per shipment, and real-time push notifications.
status: production
statusLabel: Production
stack:
  - Laravel
  - React 18
  - Redux
  - Material-UI
  - TailwindCSS
  - ECharts
  - Pusher
  - Docker
tags:
  - Full-Stack
  - Real-time
  - Enterprise
featured: true
order: 4
lang: en
slug: val-logistics
---


## The Problem

The company managed order tracking with spreadsheets and communicated via
WhatsApp. Customers had no visibility into their shipment status, operators
wasted time answering "where is my order?", and there was no way to measure the
environmental impact of operations.

## My Approach

### Order Tracking

- **Real-time tracking**: Each order goes through defined states (received, in
  preparation, in transit, delivered) with timestamps and assigned responsible party.
- **Pusher notifications**: Customers and operators receive instant updates
  when an order changes status.
- **Complete history**: Every movement is logged with user, date, and location.

### Integrated Chat

- Real-time chat between operators and customers, contextualized by order. Each
  conversation is linked to a specific shipment — no more searching through WhatsApp
  to find which message corresponds to which order.

### Operational Dashboard

- **ECharts**: Charts for shipment volume, average delivery times, orders by
  status, and weekly/monthly trends.
- **Real-time metrics**: The dashboard updates via Pusher without needing to
  refresh the page.

### CO2 Calculations

- Automatic carbon footprint calculation per shipment based on distance, vehicle
  type, and package weight. Monthly emissions reports for environmental
  compliance.

### Key Technical Decisions

- **ECharts over Recharts/Chart.js**: Handles large datasets with better performance
  and offers enterprise charts (Sankey for order flow, treemap for distribution
  by zone).
- **Redux Toolkit**: The state complexity (tracking, chat, dashboard, permissions,
  real-time updates) justified well-defined slices over lighter solutions.
- **Pusher for real-time**: Handles chat, tracking, and dashboard updates in separate
  channels to avoid overwhelming the client with unnecessary events.

## Lessons Learned

- Order-contextualized chat reduced status inquiries by 60% — customers
  see the tracking directly.
- CO2 calculations require precise route and vehicle data; with approximate
  data the result is more marketing than real metrics.
- Enterprise dashboards require robust loading states and error boundaries —
  a failing chart cannot break the entire dashboard.
