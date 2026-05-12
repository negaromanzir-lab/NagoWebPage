import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi, userApi, downloadApi, ordersApi, manualPaymentApi, ApiError } from "../lib/api";
import { useFormState } from "../hooks/useFormState";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function fmtDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtDateTime(d) { if (!d) return "—"; return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function fmtBytes(b) { if (!b) return "—"; const k = 1024, s = ["B","KB","MB","GB"]; const i = Math.floor(Math.log(b) / Math.log(k)); return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`; }
function timeLeft(expiresAt) { const diff = new Date(expiresAt) - Date.now(); if (diff <= 0) return "Expired"; const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); return h > 0 ? `${h}h ${m}m left` : `${m}m left`; }

function Spinner() { return <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />; }
function EmptyState({ icon, title, desc, action }) { return (<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600 mb-4">{icon}</div><p className="text-white font-semibold mb-1">{title}</p><p className="text-gray-500 text-sm mb-4">{desc}</p>{action}</div>); }
function OrderStatusBadge({ status }) { const m = { completed: "bg-green-500/10 text-green-400 border-green-500/20", pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", refunded: "bg-red-500/10 text-red-400 border-red-500/20", expired: "bg-gray-500/10 text-gray-400 border-gray-500/20" }; return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${m[status] || m.pending}`}>{status?.replace("_", " ")}</span>; }
function TokenStatusBadge({ status }) { const m = { active: "bg-green-500/10 text-green-400 border-green-500/20", expired: "bg-gray-500/10 text-gray-400 border-gray-500/20", exhausted: "bg-orange-500/10 text-orange-400 border-orange-500/20", revoked: "bg-red-500/10 text-red-400 border-red-500/20" }; return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${m[status] || m.expired}`}>{status}</span>; }
