import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "{{PASCAL_PLUGIN_NAME}}",
  description: "Documentation for {{PLUGIN_NAME}}",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/' }
        ]
      }
    ]
  }
})
