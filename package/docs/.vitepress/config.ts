import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Dispatch',
  description: 'Distributed task dispatch system with verifiable execution',
  base: '/dispatch/',

  head: [
    ['meta', { name: 'theme-color', content: '#3c8cff' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'API Reference', link: '/api/overview' },
      { text: 'Plugins', link: '/plugins/overview' },
      { text: 'Deploy', link: '/deploy/overview' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Dispatch?', link: '/guide/introduction' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Task Lifecycle', link: '/guide/task-lifecycle' },
            { text: 'Trust & Verification', link: '/guide/trust-and-verification' },
            { text: 'Communication Modes', link: '/guide/communication-modes' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Tasks', link: '/api/tasks' },
            { text: 'Workers', link: '/api/workers' },
            { text: 'Projects', link: '/api/projects' },
            { text: 'Audit', link: '/api/audit' },
            { text: 'WebSocket Protocol', link: '/api/websocket' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: 'Plugins',
          items: [
            { text: 'Overview', link: '/plugins/overview' },
            { text: 'Creating a Plugin', link: '/plugins/creating-a-plugin' },
            { text: 'Plugin API Reference', link: '/plugins/plugin-api-reference' },
            { text: 'Result Strategies', link: '/plugins/result-strategies' },
          ],
        },
      ],
      '/deploy/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Overview', link: '/deploy/overview' },
            { text: 'Docker', link: '/deploy/docker' },
            { text: 'Environment Variables', link: '/deploy/environment-variables' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Configuration', link: '/reference/configuration' },
            { text: 'Worker SDK', link: '/reference/worker-sdk' },
            { text: 'Type Definitions', link: '/reference/type-definitions' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rezics/dispatch' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the GPL-3.0 License.',
      copyright: 'Copyright 2026 Rezics',
    },
  },
})
