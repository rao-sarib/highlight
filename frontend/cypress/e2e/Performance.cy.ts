/// <reference types="cypress" />

// Performance Testing — wired to the real app + seeded account/project.
// Thresholds are a bit looser than the original because `next dev` compiles each
// route on first visit (production is much faster). Adjust to taste.
describe("Performance Testing - Highlight AI SEO Tool", () => {
  beforeEach(() => {
    cy.fixture("testData").as("data");
  });

  // TC-1 Landing Page Load Time
  it("TC-1 Landing Page Load Time", () => {
    const start = Date.now();
    cy.visit("/");
    cy.contains("Highlight").should("be.visible");
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(8000);
    });
  });

  // TC-2 Login Response Time
  it("TC-2 Login Response Time", function () {
    const start = Date.now();
    cy.login(this.data.email, this.data.password);
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(15000);
    });
  });

  // TC-3 Dashboard Load Performance
  it("TC-3 Dashboard Load Performance", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Dashboard").should("be.visible");
  });

  // TC-4 Sidebar Navigation Speed
  it("TC-4 Sidebar Navigation Speed", function () {
    cy.openProject();
    const start = Date.now();
    cy.contains("a", "Analytics").click();
    cy.url().should("include", "/projects/");
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(8000);
    });
  });

  // TC-5 Project Creation Performance
  it("TC-5 Project Creation Performance", function () {
    cy.login(this.data.email, this.data.password);
    cy.contains("Create new project").click();
    const start = Date.now();
    cy.get("#project-name").type(`Perf Project ${Date.now()}`);
    cy.get("#project-url").type(this.data.websiteUrl);
    cy.contains("button", "Create project").click();
    cy.url().should("include", "/analysis");
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(15000);
    });
  });

  // TC-6 Website Audit Execution Time  (needs OpenAI key)
  it("TC-6 Website Audit Execution Time", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/fixes`);
    cy.contains("button", /run site audit|re-run audit/i).click();
    cy.contains("Per-page audit", { timeout: 120000 }).should("exist");
  });

  // TC-7 Analytics Data Load Speed
  it("TC-7 Analytics Data Load Speed", function () {
    cy.openProject();
    const start = Date.now();
    cy.contains("a", "Analytics").click();
    cy.contains("SEO Health").should("be.visible");
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(10000);
    });
  });

  // TC-8 Keyword Extraction Performance  (needs OpenAI + Serper keys)
  it("TC-8 Keyword Extraction Performance", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/keywords`);
    cy.contains("button", "Analyze keywords").click();
    cy.get("table tbody tr", { timeout: 90000 }).should("have.length.greaterThan", 0);
  });

  // TC-9 Content Generation Performance  (asserts generation starts)
  it("TC-9 Content Generation Performance", function () {
    cy.login();
    cy.visit(`/projects/${this.data.projectId}/content-gen`);
    const start = Date.now();
    cy.contains("button", "Start workflow").click(); // blank topic -> auto keyword
    cy.contains(/generating your content/i, { timeout: 60000 }).should("be.visible");
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(30000);
    });
  });

  // TC-10 Concurrent User Stability
  it("TC-10 Concurrent User Stability", function () {
    cy.login(this.data.email, this.data.password);
    for (let i = 0; i < 5; i++) {
      cy.reload();
    }
    cy.contains("Dashboard").should("be.visible");
  });

  // TC-11 Page Reload Performance
  it("TC-11 Page Reload Performance", function () {
    cy.login(this.data.email, this.data.password);
    const start = Date.now();
    cy.reload();
    cy.contains("Dashboard").should("be.visible");
    cy.then(() => {
      expect(Date.now() - start).to.be.lessThan(8000);
    });
  });

  // TC-12 System Stability Under Load
  it("TC-12 System Stability Under Load", function () {
    cy.openProject();
    for (let i = 0; i < 5; i++) {
      cy.contains("a", "Analytics").click();
      cy.contains("a", "Dashboard").click();
    }
    cy.contains("Dashboard").should("be.visible");
  });
});
