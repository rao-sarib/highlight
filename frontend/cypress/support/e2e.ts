// Loaded automatically before every spec file.
import "./commands";

// `next dev` emits a benign React "hydration" warning (server/client HTML diff)
// that Cypress would otherwise treat as a test failure. These are dev-mode
// artifacts that don't affect behaviour, so don't let app-level uncaught
// exceptions fail the tests — the assertions decide pass/fail.
Cypress.on("uncaught:exception", () => false);

// Capture a screenshot after EVERY test (pass or fail), so each test case has a
// labelled image for your report. Failures are also auto-captured by Cypress.
// Remove this block if your own specs already call cy.screenshot().
afterEach(function () {
  const test = this.currentTest;
  if (!test) return;
  const state = test.state ?? "done";
  const name = `${state}-${test.fullTitle()}`.replace(/[^a-z0-9-_ ]/gi, "_");
  cy.screenshot(name, { capture: "viewport", overwrite: true });
});
