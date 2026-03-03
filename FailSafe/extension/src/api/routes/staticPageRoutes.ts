/**
 * Static Page Routes
 *
 * Serves HTML pages from the webui/pages directory.
 * Extracted from FailSafeApiServer for Section 4 Simplicity.
 */

import * as path from "path";
import * as fs from "fs";
import { Request, Response, Application } from "express";

const PAGES_DIR = path.join(__dirname, "../../webui/pages");

/**
 * Creates a handler that serves an HTML page from the pages directory.
 */
function serveHtmlPage(filePath: string) {
  return (_req: Request, res: Response): void => {
    const fullPath = path.join(PAGES_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.sendFile(fullPath);
    } else {
      res.status(404).json({ error: "Page not found", path: filePath });
    }
  };
}

/**
 * Registers static page routes on the Express app.
 *
 * Routes:
 * - /ui/console, /ui/dashboard, /ui/risks, /ui/transparency, /ui/brainstorm
 * - /index.html, /dashboard.html, /risk-register.html, /transparency.html, /brainstorm.html
 */
export function registerStaticPageRoutes(app: Application): void {
  // Prefixed UI routes
  app.get("/ui/console", serveHtmlPage("index.html"));
  app.get("/ui/dashboard", serveHtmlPage("dashboard.html"));
  app.get("/ui/risks", serveHtmlPage("risk-register.html"));
  app.get("/ui/transparency", serveHtmlPage("transparency.html"));
  app.get("/ui/brainstorm", serveHtmlPage("brainstorm.html"));

  // Raw static pages for iframe routing
  app.get("/index.html", serveHtmlPage("index.html"));
  app.get("/dashboard.html", serveHtmlPage("dashboard.html"));
  app.get("/risk-register.html", serveHtmlPage("risk-register.html"));
  app.get("/transparency.html", serveHtmlPage("transparency.html"));
  app.get("/brainstorm.html", serveHtmlPage("brainstorm.html"));
}
