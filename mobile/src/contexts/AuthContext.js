/**
 * AuthContext.js
 * ─────────────
 * Custom auth context that replaces ClerkProvider / useAuth / useUser.
 *
 * Holds the access token + user profile in memory (plus the refresh token in
 * expo-secure-store so it survives app restarts). Provides signup, login,
 * refresh, and logout.
 *
* Any screen that previously called useAuth() / useUser() should use
 * useAuth() from this module instead.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "../config/api";

const AuthContext = createContext(null);

// Keys for expo-secure-store. The access token lives in memory (short
// lifetime) so a background-kill never leaves it lying around; the refresh
// token is what gets persisted.
const REFRESH_TOKEN_KEY = "tasklink_refresh_token";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(null);       // access JWT
    const [user, setUser] = useState(null);          // profile row
    const [loading, setLoading] = useState(true);    // boot check
    const [refreshToken, setRefreshToken] = useState(null);

    // ─── Boot: restore refresh token + user from secure store ──────────────
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const rt = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
                if (rt) {
                    setRefreshToken(rt);
                    await refreshSession(rt, false);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Persist / clear refresh token ─────────────────────────────────────
    async function storeRefreshToken(rt) {
        setRefreshToken(rt);
        if (rt) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, rt);
        } else {
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        }
    }

    // ─── Core: mint tokens + user from a login/register response ──────────
    function applyAuth(resp) {
        if (resp?.accessToken) setToken(resp.accessToken);
        if (resp?.refreshToken) storeRefreshToken(resp.refreshToken);
        if (resp?.user) setUser(resp.user);
    }

    // ─── POST /api/auth/register ──────────────────────────────────────────
    async function signup({ email, password, firstName, lastName }) {
        const resp = await apiFetch("/auth/register", null, {
            method: "POST",
            body: JSON.stringify({ email, password, firstName, lastName }),
        });
        applyAuth(resp);
        return resp;
    }

    // ─── POST /api/auth/login ─────────────────────────────────────────────
    async function login({ email, password }) {
        const resp = await apiFetch("/auth/login", null, {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        applyAuth(resp);
        return resp;
    }

    // ─── POST /api/auth/refresh ───────────────────────────────────────────
    async function refreshSession(rt, silent = true) {
        if (!rt) return null;
        try {
            const resp = await apiFetch("/auth/refresh", null, {
                method: "POST",
                body: JSON.stringify({ refreshToken: rt }),
            });
            if (resp?.accessToken) setToken(resp.accessToken);
            if (resp?.refreshToken) storeRefreshToken(resp.refreshToken);
            // Fetch the profile now we have a valid access token.
            if (resp?.accessToken) await loadMe(resp.accessToken);
            return resp;
        } catch (err) {
            // Stale refresh token — clear everything and force re-login.
            await storeRefreshToken(null);
            setToken(null);
            setUser(null);
            if (!silent) throw err;
            return null;
        }
    }

    // ─── GET /api/user/me ─────────────────────────────────────────────────
    async function loadMe(overrideToken) {
        const t = overrideToken ?? token;
        if (!t) return null;
        try {
            const me = await apiFetch("/user/me", t);
            setUser(me);
            return me;
        } catch (err) {
            console.log("[AuthContext] loadMe error:", err.message);
            return null;
        }
    }

    // ─── POST /api/auth/logout ────────────────────────────────────────────
    async function logout() {
        try {
            if (token) {
                await apiFetch("/auth/logout", token, { method: "POST" }).catch(() => {});
            }
        } finally {
            setToken(null);
            setUser(null);
            await storeRefreshToken(null);
        }
    }

    // ─── POST /api/auth/forgot-password ───────────────────────────────────
    async function forgotPassword(email) {
        return apiFetch("/auth/forgot-password", null, {
            method: "POST",
            body: JSON.stringify({ email }),
        });
    }

    // ─── POST /api/auth/reset-password ────────────────────────────────────
    async function resetPassword(email, code, newPassword) {
        return apiFetch("/auth/reset-password", null, {
            method: "POST",
            body: JSON.stringify({ email, code, newPassword }),
        });
    }

    // Whenever the access token changes, (re)load the profile.
    useEffect(() => {
        if (token) loadMe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const value = {
        token,
        user,
        loading,
        signup,
        login,
        refresh: () => refreshSession(refreshToken, false),
        logout,
        forgotPassword,
        resetPassword,
        // Convenience mirrors used widely across the codebase.
        isLoaded: !loading,
        isSignedIn: !!token,
        getToken: async () => token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
}