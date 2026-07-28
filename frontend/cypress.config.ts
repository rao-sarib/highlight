import { defineConfig } from "cypress";

export default defineConfig({
  // Seeded test account + project (see backend seed). Used by cy.login() and specs.
  env: {
    email: "cypress.tester@gmail.com",
    password: "Cypress@123",
    projectName: "Cypress Test Project",
    websiteUrl: "https://example.com",
    projectId: "6653231e-00dd-482b-91fb-ef65276d3ddf",
  },

  // App under test (start it with `npm run dev` first).
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on, config) {
      return config;
    },
  },

  // Consistent, report-friendly screenshot/video output.
  viewportWidth: 1366,
  viewportHeight: 768,
  screenshotsFolder: "cypress/screenshots",
  videosFolder: "cypress/videos",
  video: true,
  screenshotOnRunFailure: true,

  // Generous timeouts — a backend-backed app, and `next dev` compiles routes on
  // first visit. (A production build via `npm run build && npm run start` makes
  // these comfortably fast.)
  defaultCommandTimeout: 15000,
  pageLoadTimeout: 120000,
  requestTimeout: 30000,
  responseTimeout: 60000,
  retries: { runMode: 1, openMode: 0 },
});
