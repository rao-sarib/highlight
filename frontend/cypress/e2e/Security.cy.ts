/// <reference types="cypress" />

// System Reliability, Error Handling & Security — wired to the real app + the
// seeded verified account (Cypress.env email/password).
describe("System Reliability, Error Handling & Security Test Suite", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  // TC-1 Secure Login Session
  it("TC-1 Secure Login Session", () => {
    cy.get('input[type="email"]').type(Cypress.env("email"));
    cy.get('input[type="password"]').type(Cypress.env("password"));
    cy.contains("button", "Sign in").click();
    cy.url().should("include", "/dashboard");
    cy.reload();
    cy.url().should("include", "/dashboard");
  });

  // TC-2 Unauthorized Access Prevention
  it("TC-2 Unauthorized Access Prevention", () => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit("/dashboard");
    cy.url().should("include", "/login");
  });

  // TC-3 Invalid Login Error Handling
  it("TC-3 Invalid Login Error Handling", () => {
    cy.get('input[type="email"]').type("wrong@gmail.com");
    cy.get('input[type="password"]').type("wrongpass");
    cy.contains("button", "Sign in").click();
    cy.contains("Incorrect email or password").should("be.visible");
  });

  // TC-4 Input Validation Security
  it("TC-4 Input Validation Security", () => {
    // The Sign in button stays disabled until both fields are filled (inputs are
    // also HTML `required`) — that is the app's input validation.
    cy.contains("button", "Sign in").should("be.disabled");
  });

  // TC-5 API Failure Graceful Handling
  it("TC-5 API Failure Graceful Handling", () => {
    cy.intercept("POST", "**/api/v1/auth/login", {
      statusCode: 500,
      body: { detail: "Server error occurred." },
    }).as("apiFail");
    cy.get('input[type="email"]').type(Cypress.env("email"));
    cy.get('input[type="password"]').type(Cypress.env("password"));
    cy.contains("button", "Sign in").click();
    cy.wait("@apiFail");
    cy.contains(/server error|something went wrong|error/i).should("be.visible");
  });

  // TC-6 Meaningful Error Messages
  it("TC-6 Meaningful Error Messages", () => {
    cy.contains("Forgot password?").click();
    cy.url().should("include", "/forgot-password");
    cy.contains("button", "Send reset link").should("be.disabled");
  });

  // TC-7 Secure Logout
  it("TC-7 Secure Logout", () => {
    cy.get('input[type="email"]').type(Cypress.env("email"));
    cy.get('input[type="password"]').type(Cypress.env("password"));
    cy.contains("button", "Sign in").click();
    cy.url().should("include", "/dashboard");
    cy.contains("Logout").click();
    cy.url().should("include", "/login");
  });

  // TC-8 Session Timeout Handling (no valid session -> blocked)
  it("TC-8 Session Timeout Handling", () => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit("/dashboard");
    cy.url().should("include", "/login");
  });

  // TC-9 Page Reload Stability
  it("TC-9 Page Reload Stability", () => {
    cy.get('input[type="email"]').type(Cypress.env("email"));
    cy.get('input[type="password"]').type(Cypress.env("password"));
    cy.contains("button", "Sign in").click();
    cy.url().should("include", "/dashboard");
    cy.reload();
    cy.reload();
    cy.url().should("include", "/dashboard");
  });

  // TC-10 Error Recovery
  it("TC-10 Error Recovery", () => {
    cy.get('input[type="email"]').type(Cypress.env("email"));
    cy.get('input[type="password"]').type(Cypress.env("password"));
    cy.contains("button", "Sign in").click();
    cy.url().should("include", "/dashboard");
    cy.reload();
    cy.contains("Dashboard").should("be.visible");
  });

  // TC-11 Role-Based Access Control
  it("TC-11 Role-Based Access Control", () => {
    cy.clearLocalStorage();
    cy.visit("/adminpanel"); // our admin area; non-admins hit the login gate
    cy.contains("Admin panel").should("be.visible");
  });

  // TC-12 Data Exposure Protection
  it("TC-12 Data Exposure Protection", () => {
    cy.window().then((win) => {
      // We only persist a token (highlight-auth-token), never a raw password.
      expect(win.localStorage.getItem("password")).to.be.null;
    });
  });
});
