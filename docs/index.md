---
layout: home

hero:
  name: Dispatch
  text: Distributed Task Dispatch
  tagline: A verifiable task queue system with pluggable workers and real-time monitoring.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/rezics/dispatch

features:
  - title: Distributed Task Queue
    details: Submit tasks to a central Hub and let workers claim and process them. Supports priority scheduling, automatic retries, and lease-based execution.
  - title: Verifiable Execution
    details: Three trust levels (full, receipted, audited) ensure task completion integrity with HMAC-SHA256 signed receipts and anti-replay nonce protection.
  - title: Plugin System
    details: Build custom task handlers as plugins with typed configuration, lifecycle hooks, and progress reporting. Register multiple plugins per worker.
---
