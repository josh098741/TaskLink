/**
 * __tests__/jwt.test.js
 * ????????????????????????
 * Unit tests for src/utils/jwt.js — pure functions, no DB required.
 * Uses Node's built-in test runner (node --test).
 *
 * The env vars are set BEFORE importing jwt.js because env.js snapshots
 * process.env at module-load time.
 */

process.env.JWT_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const test = (await import("node:test")).test;
const assert = (await import("node:assert/strict")).default;

const {
    signAccessToken,
    signRefreshToken,
    signTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
} = await import("../src/utils/jwt.js");

await test("sign/verify access token round-trips", () => {
    const token = signAccessToken("user-123");
    const payload = verifyAccessToken(token);
    assert.equal(payload.userId, "user-123");
    assert.equal(payload.type, "access");
});

await test("refresh token is rejected as an access token", () => {
    const refresh = signRefreshToken("user-123");
    assert.throws(() => verifyAccessToken(refresh));
});

await test("tampered token is rejected", () => {
    const token = signAccessToken("user-123");
    const tampered = token.slice(0, -3) + "xxx";
    assert.throws(() => verifyAccessToken(tampered));
});

await test("expired access token is rejected", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const old = jwt.sign(
        { userId: "user-123", type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: "0s" }
    );
    await new Promise((r) => setTimeout(r, 30));
    assert.throws(() => verifyAccessToken(old));
});

await test("sign/verify refresh token round-trips", () => {
    const token = signRefreshToken("user-456");
    const payload = verifyRefreshToken(token);
    assert.equal(payload.userId, "user-456");
    assert.equal(payload.type, "refresh");
});

await test("access token is rejected as a refresh token", () => {
    const access = signAccessToken("user-456");
    assert.throws(() => verifyRefreshToken(access));
});

await test("signTokenPair returns both tokens for the same user", () => {
    const pair = signTokenPair("user-789");
    assert.equal(verifyAccessToken(pair.accessToken).userId, "user-789");
    assert.equal(verifyRefreshToken(pair.refreshToken).userId, "user-789");
});