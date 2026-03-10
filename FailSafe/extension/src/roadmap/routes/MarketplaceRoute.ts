/**
 * MarketplaceRoute - REST API endpoints for the Agent Marketplace
 *
 * Provides catalog browsing, installation with HITL gates, security scanning,
 * and uninstallation endpoints.
 */
import { Request, Response } from "express";
import * as crypto from "crypto";
import type { MarketplaceCatalog } from "../services/MarketplaceCatalog";
import type { MarketplaceInstaller } from "../services/MarketplaceInstaller";
import type { SecurityScanner } from "../services/SecurityScanner";
import type { LedgerManager } from "../../qorelogic/ledger/LedgerManager";
import type { HITLRequest } from "../services/MarketplaceTypes";

export type MarketplaceRouteDeps = {
  rejectIfRemote: (req: Request, res: Response) => boolean;
  broadcast: (data: Record<string, unknown>) => void;
  marketplaceCatalog: MarketplaceCatalog;
  marketplaceInstaller: MarketplaceInstaller;
  securityScanner: SecurityScanner;
  ledgerManager?: LedgerManager;
};

// In-memory HITL nonce store (5 minute TTL)
const pendingApprovals = new Map<string, HITLRequest>();

function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

function cleanExpiredNonces(): void {
  const now = Date.now();
  for (const [nonce, request] of pendingApprovals) {
    if (new Date(request.expiresAt).getTime() < now) {
      pendingApprovals.delete(nonce);
    }
  }
}

export function setupMarketplaceRoutes(
  app: import("express").Application,
  deps: MarketplaceRouteDeps,
): void {
  // Clean expired nonces periodically
  setInterval(cleanExpiredNonces, 60000);

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/marketplace/catalog - Get all marketplace items
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/marketplace/catalog", async (_req: Request, res: Response) => {
    const catalog = deps.marketplaceCatalog.getCatalog();
    const scannerStatus = await deps.securityScanner.checkAvailability();
    deps.marketplaceCatalog.setScannerAvailability(scannerStatus);

    res.json({
      items: catalog,
      scanners: scannerStatus,
      globalCachePath: deps.marketplaceCatalog.getCachePath(),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/marketplace/item/:id - Get single item details
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/marketplace/item/:id", (req: Request, res: Response) => {
    const itemId = String(req.params.id);
    const item = deps.marketplaceCatalog.getItem(itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ item });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/marketplace/install/:id - Request install (returns HITL nonce)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/marketplace/install/:id", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;

    const itemId = String(req.params.id);
    const item = deps.marketplaceCatalog.getItem(itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    if (item.status === "installing" || item.status === "scanning") {
      res.status(409).json({ error: "Installation already in progress" });
      return;
    }

    // Generate HITL nonce for approval
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const hitlRequest: HITLRequest = {
      nonce,
      action: "marketplace.install",
      itemId: item.id,
      itemName: item.name,
      expiresAt,
    };

    pendingApprovals.set(nonce, hitlRequest);

    res.json({
      status: "pending_approval",
      nonce,
      expiresAt,
      item: {
        id: item.id,
        name: item.name,
        author: item.author,
        repoUrl: item.repoUrl,
        requiredPermissions: item.requiredPermissions,
        licenseType: item.licenseType,
      },
      message: `Installation of ${item.name} requires confirmation. Use the nonce to confirm.`,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/marketplace/install/:id/confirm - Confirm installation with nonce
  // ═══════════════════════════════════════════════════════════════════════════
  app.post(
    "/api/marketplace/install/:id/confirm",
    async (req: Request, res: Response) => {
      if (deps.rejectIfRemote(req, res)) return;

      const itemId = String(req.params.id);
      const { nonce, sandboxEnabled = true, runSecurityScan = true } = req.body;

      // Validate nonce
      const hitlRequest = pendingApprovals.get(nonce);
      if (!hitlRequest) {
        res.status(403).json({ error: "Invalid or expired approval nonce" });
        return;
      }

      if (hitlRequest.itemId !== itemId) {
        res.status(403).json({ error: "Nonce does not match item" });
        return;
      }

      if (new Date(hitlRequest.expiresAt).getTime() < Date.now()) {
        pendingApprovals.delete(nonce);
        res.status(403).json({ error: "Approval nonce has expired" });
        return;
      }

      // Consume nonce (one-time use)
      pendingApprovals.delete(nonce);

      const item = deps.marketplaceCatalog.getItem(itemId);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      // Update status to installing
      deps.marketplaceCatalog.updateItemStatus(item.id, {
        status: "installing",
      });

      deps.broadcast({
        type: "marketplace.installing",
        payload: { itemId: item.id },
      });

      // Start async installation
      deps.marketplaceInstaller
        .install(
          item,
          { sandboxEnabled, runSecurityScan },
          (progress) => {
            deps.broadcast({
              type: "marketplace.progress",
              payload: { itemId: item.id, ...progress },
            });
          },
        )
        .then(async (result) => {
          if (result.success) {
            deps.marketplaceCatalog.updateItemStatus(item.id, {
              status: runSecurityScan ? "scanning" : "installed",
              installPath: result.installPath,
              installedAt: new Date().toISOString(),
              sandboxEnabled,
            });

            // Run security scan if requested
            if (runSecurityScan && result.installPath) {
              deps.broadcast({
                type: "marketplace.scanning",
                payload: { itemId: item.id },
              });

              const scanResult = await deps.securityScanner.runFullScan(
                result.installPath,
                (msg) => {
                  deps.broadcast({
                    type: "marketplace.scan.progress",
                    payload: { itemId: item.id, message: msg },
                  });
                },
              );

              deps.marketplaceCatalog.updateItemStatus(item.id, {
                status: scanResult.passed ? "installed" : "quarantined",
                securityScan: scanResult,
                trustTier: scanResult.passed ? "scanned" : "quarantined",
              });

              deps.broadcast({
                type: "marketplace.scanned",
                payload: { itemId: item.id, result: scanResult },
              });
            }

            // Record to ledger
            if (deps.ledgerManager) {
              deps.ledgerManager.appendEntry({
                eventType: "MARKETPLACE_INSTALL",
                agentDid: "did:failsafe:marketplace",
                payload: {
                  itemId: item.id,
                  itemName: item.name,
                  success: true,
                  installPath: result.installPath,
                  sandboxEnabled,
                  securityScanEnabled: runSecurityScan,
                },
              });
            }

            deps.broadcast({
              type: "marketplace.installed",
              payload: { itemId: item.id, installPath: result.installPath },
            });
          } else {
            deps.marketplaceCatalog.updateItemStatus(item.id, {
              status: "failed",
            });

            deps.broadcast({
              type: "marketplace.failed",
              payload: { itemId: item.id, error: result.error },
            });
          }
        });

      res.json({
        status: "installing",
        itemId: item.id,
        message: "Installation started. Progress will be broadcast via WebSocket.",
      });
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/marketplace/scan/:id - Run security scan on installed item
  // ═══════════════════════════════════════════════════════════════════════════
  app.post("/api/marketplace/scan/:id", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;

    const itemId = String(req.params.id);
    const item = deps.marketplaceCatalog.getItem(itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    if (!item.installPath) {
      res.status(400).json({ error: "Item is not installed" });
      return;
    }

    // Update status
    deps.marketplaceCatalog.updateItemStatus(item.id, { status: "scanning" });

    deps.broadcast({
      type: "marketplace.scanning",
      payload: { itemId: item.id },
    });

    // Run scan asynchronously
    deps.securityScanner
      .runFullScan(item.installPath, (msg) => {
        deps.broadcast({
          type: "marketplace.scan.progress",
          payload: { itemId: item.id, message: msg },
        });
      })
      .then((scanResult) => {
        deps.marketplaceCatalog.updateItemStatus(item.id, {
          status: scanResult.passed ? "installed" : "quarantined",
          securityScan: scanResult,
          trustTier: scanResult.passed ? "scanned" : "quarantined",
        });

        deps.broadcast({
          type: "marketplace.scanned",
          payload: { itemId: item.id, result: scanResult },
        });
      });

    res.json({
      status: "scanning",
      itemId: item.id,
      message: "Security scan started. Results will be broadcast via WebSocket.",
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/marketplace/uninstall/:id - Uninstall an item
  // ═══════════════════════════════════════════════════════════════════════════
  app.delete(
    "/api/marketplace/uninstall/:id",
    async (req: Request, res: Response) => {
      if (deps.rejectIfRemote(req, res)) return;

      const itemId = String(req.params.id);
      const item = deps.marketplaceCatalog.getItem(itemId);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      const success = await deps.marketplaceInstaller.uninstall(item);

      if (success) {
        deps.marketplaceCatalog.updateItemStatus(item.id, {
          status: "not-installed",
          installPath: undefined,
          installedAt: undefined,
          securityScan: undefined,
          trustTier: "unverified",
        });

        // Record to ledger
        if (deps.ledgerManager) {
          deps.ledgerManager.appendEntry({
            eventType: "MARKETPLACE_UNINSTALL",
            agentDid: "did:failsafe:marketplace",
            payload: { itemId: item.id, itemName: item.name },
          });
        }

        deps.broadcast({
          type: "marketplace.uninstalled",
          payload: { itemId: item.id },
        });
      }

      res.json({ success, itemId: item.id });
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/marketplace/scanners - Check scanner availability
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/marketplace/scanners", async (_req: Request, res: Response) => {
    const status = await deps.securityScanner.checkAvailability();
    deps.marketplaceCatalog.setScannerAvailability(status);
    res.json(status);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/marketplace/featured - Get featured items
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/marketplace/featured", (_req: Request, res: Response) => {
    res.json({ items: deps.marketplaceCatalog.getFeatured() });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/marketplace/installed - Get installed items
  // ═══════════════════════════════════════════════════════════════════════════
  app.get("/api/marketplace/installed", (_req: Request, res: Response) => {
    res.json({ items: deps.marketplaceCatalog.getInstalled() });
  });
}
