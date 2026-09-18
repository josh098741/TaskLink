/**
 * __tests__/structure.test.js
 * ────────────────────────────────
 * Structural pre-push checks that don't need a DB:
 *   1. Every source file parses as ESM.
 *   2. No Clerk / svix references remain.
 *   3. No clerkId references remain (outside comments).
 *   4. Webhook files are gone.
 *   5. Required auth files exist.
 *   6. server.js mounts authRouter, not webhookRouter.
 *   7. Routers use authenticate, not clerkMiddleware.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SRC_DIR = path.resolve("src");

function walk(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(full));
        else if (entry.name.endsWith(".js")) files.push(full);
    }
    return files;
}

const files = walk(SRC_DIR);

await test("every source file parses as ESM", () => {
    for (const file of files) {
        execSync(`node --check "${file}"`, { stdio: "ignore" });
    }
    assert.ok(files.length > 0, "expected at least one source file");
});

await test("no @clerk / svix imports remain", () => {
    const offenders = [];
    for (const file of files) {
        const text = fs.readFileSync(file, "utf8");
        if (/@clerk\/express|@clerk\/backend|@clerk\/shared|svix/.test(text)) {
            offenders.push(path.relative(SRC_DIR, file));
        }
    }
    assert.deepEqual(offenders, []);
});

await test("no clerkId references remain (outside comments)", () => {
    const offenders = [];
    for (const file of files) {
        const text = fs.readFileSync(file, "utf8");
        const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
        if (/\bclerkId\b/.test(code)) offenders.push(path.relative(SRC_DIR, file));
    }
    assert.deepEqual(offenders, []);
});

await test("webhook files are deleted", () => {
    assert.ok(!fs.existsSync(path.join(SRC_DIR, "routers", "webhookRouter.js")));
    assert.ok(!fs.existsSync(path.join(SRC_DIR, "Controllers", "webhookController.js")));
});

await test("required auth files exist", () => {
    assert.ok(fs.existsSync(path.join(SRC_DIR, "utils", "jwt.js")));
    assert.ok(fs.existsSync(path.join(SRC_DIR, "middleware", "auth.js")));
    assert.ok(fs.existsSync(path.join(SRC_DIR, "Controllers", "authController.js")));
    assert.ok(fs.existsSync(path.join(SRC_DIR, "routers", "authRouter.js")));
});

await test("server.js mounts authRouter and not webhookRouter", () => {
    const text = fs.readFileSync(path.join(SRC_DIR, "server.js"), "utf8");
    assert.ok(text.includes("authRouter"), "server.js should import authRouter");
    assert.ok(!text.includes("webhookRouter"), "server.js should not import webhookRouter");
});

await test("routers use authenticate middleware, not clerkMiddleware", () => {
    for (const name of ["userRouter.js", "postRouter.js"]) {
        const text = fs.readFileSync(path.join(SRC_DIR, "routers", name), "utf8");
        assert.ok(text.includes("authenticate"), `${name} should use authenticate`);
        assert.ok(!text.includes("clerkMiddleware"), `${name} should not use clerkMiddleware`);
    }
});