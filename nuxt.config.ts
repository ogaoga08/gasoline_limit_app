// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  app: {
    head: {
      script: [
        { src: 'https://trial.api-service.navitime.biz/intern01/v2/map_script?host=localhost:3333' },
      ]
    }
  },

  nitro: {
    devProxy: {
      '/api': {
        target: `https://trial.api-service.navitime.biz`,
        changeOrigin: true,
      },
    },
  },

  compatibilityDate: '2024-07-23',
})