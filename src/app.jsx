import { useState, useCallback, useRef, useEffect } from "react";
import fig_closed from "./assets/fig_closed.png";
import fig_open from "./assets/fig_open.png";
import olives from "./assets/olives.png";
import olive_branch from "./assets/olive_branch.png";
import figs_branch from "./assets/figs_branch.png";
import pomegranate from "./assets/pomegranate.png";
import React from "react";
import ReactDOM from "react-dom/client";

const IMGS = { fig_closed, fig_open, olives, olive_branch, figs_branch, pomegranate };

const C = {
  burgundy: "#6B2737",
  sage: "#6B8F66",
  ivory: "#F4EDE0",
  pom: "#B83832",
  fig: "#6D4C5E",
  sageLight: "#A8B89A",
  sageDark: "#4A6645",
  dark: "#241419",
  white: "#FDFAF4",
};

const stripe = `linear-gradient(90deg, ${C.burgundy}, ${C.burgundy}, ${C.fig}, ${C.burgundy}, ${C.burgundy})`;

/* ─── Google Drive Upload via Apps Script ─────────────────────────────────── */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

/* ─── Filters ─────────────────────────────────────────────────────────────── */
const FILTERS = [
  { name: "None",    value: "none" },
  { name: "Warm",    value: "sepia(0.35) saturate(1.4) brightness(1.05) contrast(1.1)" },
  { name: "B&W",     value: "grayscale(1) contrast(1.5)" },
  { name: "Golden",  value: "sepia(0.5) saturate(1.8) hue-rotate(-15deg)" },
  { name: "Vivid",   value: "brightness(0.82) contrast(1.4) saturate(1.3)" },
  { name: "Film",     value: "sepia(0.55) saturate(0.6) contrast(1.2) brightness(0.88) hue-rotate(5deg)" },
];

function applyFilterToImage(dataUrl, filterCSS) {
  if (filterCSS === "none") return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.filter = filterCSS;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = dataUrl;
  });
}

async function uploadToDrive(imageDataUrl, guestName) {
  const base64Data = imageDataUrl.split(",")[1];
  const timestamp = Date.now();
  const filename = `${timestamp}-${guestName || "guest"}.jpg`;

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ image: base64Data, filename }),
  });

  return true;
}

/* ─── Global mobile setup ─────────────────────────────────────────────────── */
function injectGlobals() {
  if (!document.getElementById("vp-meta")) {
    const m = document.createElement("meta");
    m.id = "vp-meta"; m.name = "viewport";
    m.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
    document.head.appendChild(m);
  }
  if (!document.getElementById("amiri-font")) {
    const link = document.createElement("link");
    link.id = "amiri-font"; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap";
    document.head.appendChild(link);
  }
  if (!document.getElementById("global-style")) {
    const s = document.createElement("style");
    s.id = "global-style";
    s.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; overscroll-behavior: none; }
      button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      input  { -webkit-tap-highlight-color: transparent; }
      @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      @keyframes slideIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(8px); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(s);
  }
}

/* ─── Toast system ────────────────────────────────────────────────────────── */
// Each toast: { id, status: 'uploading' | 'success' | 'error', message }

function Toast({ toast, onDismiss }) {
  const isUploading = toast.status === "uploading";
  const isSuccess   = toast.status === "success";

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => onDismiss(toast.id), 3000);
      return () => clearTimeout(t);
    }
  }, [toast.status]); // eslint-disable-line

  const bg = isUploading ? C.fig : isSuccess ? C.sage : C.pom;
  const icon = isUploading ? "🌀" : isSuccess ? "✓" : "✕";

  return (
    <div
      onClick={() => !isUploading && onDismiss(toast.id)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: bg, color: "white",
        borderRadius: 14, padding: "12px 16px",
        fontFamily: "Amiri, Georgia, serif", fontSize: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        animation: "slideIn 0.3s ease",
        cursor: isUploading ? "default" : "pointer",
        maxWidth: 260, userSelect: "none",
      }}
    >
      <span style={{
        fontSize: 18, lineHeight: 1,
        animation: isUploading ? "spin 1.2s linear infinite" : "none",
        display: "inline-block"
      }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          {isUploading ? "Uploading…" : isSuccess ? "Saved to album!" : "Upload failed"}
        </div>
        {toast.status === "error" && toast.message && (
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{toast.message}</div>
        )}
        {isSuccess && (
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2, direction: "rtl" }}>
            صورتك في الألبوم ♡
          </div>
        )}
      </div>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 16,
      zIndex: 100,
      display: "flex", flexDirection: "column", gap: 10,
      alignItems: "flex-end",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

/* ─── Buttons ─────────────────────────────────────────────────────────────── */
function BtnPrimary({ children, onClick, style, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#aaa" : C.burgundy, color: C.white,
      border: "none", borderRadius: 14, padding: "15px 36px",
      fontSize: 17, fontFamily: "Amiri, Georgia, serif",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.03em", fontWeight: 700,
      minHeight: 52, touchAction: "manipulation",
      userSelect: "none", ...style
    }}>{children}</button>
  );
}

function BtnSecondary({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent", color: C.burgundy,
      border: `2px solid ${C.burgundy}`, borderRadius: 14,
      padding: "13px 28px", fontSize: 16,
      fontFamily: "Amiri, Georgia, serif", cursor: "pointer",
      letterSpacing: "0.03em", fontWeight: 700,
      minHeight: 52, touchAction: "manipulation",
      userSelect: "none", ...style
    }}>{children}</button>
  );
}

/* ─── WelcomeScreen ───────────────────────────────────────────────────────── */
function WelcomeScreen({ onStart }) {
  return (
    <div style={{
      minHeight: "100dvh", background: C.ivory,
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "Amiri, Georgia, serif", overflow: "hidden",
      paddingBottom: "env(safe-area-inset-bottom)"
    }}>
      <div style={{ width: "100%", height: 6, background: stripe, flexShrink: 0 }} />

      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", flexShrink: 0 }}>
        <img src={IMGS.olive_branch} alt="" style={{
          width: "clamp(100px, 35vw, 150px)", opacity: 0.85,
          transform: "scaleX(-1) rotate(-10deg)", marginLeft: -14, marginTop: -8
        }} />
        <img src={IMGS.olive_branch} alt="" style={{
          width: "clamp(100px, 35vw, 150px)", opacity: 0.85,
          transform: "rotate(-10deg)", marginRight: -14, marginTop: -8
        }} />
      </div>

      <div style={{
        textAlign: "center", padding: "0 24px", marginTop: -16, flex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <img src={IMGS.pomegranate} alt="" style={{ width: "clamp(72px, 22vw, 100px)", marginBottom: 4 }} />
        <h1 style={{
          color: C.burgundy, fontSize: "clamp(26px, 8vw, 38px)",
          fontWeight: 700, margin: 0, lineHeight: 1.15
        }}>Mahmoud &amp; Shaden</h1>
        <p style={{ color: C.burgundy, fontSize: "clamp(16px, 5vw, 22px)", margin: "4px 0 0", letterSpacing: "0.05em" }}>
          محمود وشادن
        </p>
        <p style={{ color: C.fig, fontSize: "clamp(12px, 3.5vw, 15px)", margin: "8px 0 0", letterSpacing: "0.08em" }}>
          14 · 05 · 2026
        </p>
        <p style={{ color: C.fig, fontSize: "clamp(12px, 3.5vw, 14px)", margin: "2px 0 0" }}>
          ١٤ مايو ٢٠٢٦
        </p>

        <div style={{
          border: `2px solid ${C.burgundy}88`, borderRadius: 14,
          padding: "14px 18px", margin: "20px 0",
          background: `${C.burgundy}08`, maxWidth: 340, width: "100%"
        }}>
          <p style={{ color: C.dark, fontSize: "clamp(13px, 3.8vw, 15px)", margin: 0, lineHeight: 1.7 }}>
            Capture a memory with us!<br />
            Take a photo and it'll go straight to our album.
          </p>
          <p style={{ color: C.dark, fontSize: "clamp(13px, 3.8vw, 15px)", margin: "8px 0 0", lineHeight: 1.7, direction: "rtl" }}>
            التقط صورة معنا!<br />
            ستُضاف صورتك مباشرةً إلى ألبومنا.
          </p>
        </div>

        <BtnPrimary onClick={onStart} style={{ width: "100%", maxWidth: 280 }}>
          Start · ابدأ
        </BtnPrimary>
      </div>

      <div style={{ paddingBottom: 16, flexShrink: 0 }}>
        <img src={IMGS.figs_branch} alt="" style={{ width: "clamp(120px, 42vw, 170px)", opacity: 0.7 }} />
      </div>
      <div style={{ width: "100%", height: 6, background: stripe, flexShrink: 0 }} />
    </div>
  );
}

/* ─── NameScreen ──────────────────────────────────────────────────────────── */
function NameScreen({ onSubmit, onSkip }) {
  const [name, setName] = useState("");
  const handle = () => onSubmit(name.trim());

  return (
    <div style={{
      minHeight: "100dvh", background: C.ivory,
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "Amiri, Georgia, serif",
      paddingBottom: "env(safe-area-inset-bottom)"
    }}>
      <div style={{ width: "100%", height: 6, background: stripe }} />

      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", flexShrink: 0 }}>
        <img src={IMGS.olive_branch} alt="" style={{
          width: "clamp(80px, 28vw, 120px)", opacity: 0.75,
          transform: "scaleX(-1) rotate(-10deg)", marginLeft: -14, marginTop: -8
        }} />
        <img src={IMGS.olive_branch} alt="" style={{
          width: "clamp(80px, 28vw, 120px)", opacity: 0.75,
          transform: "rotate(-10deg)", marginRight: -14, marginTop: -8
        }} />
      </div>

      <div style={{
        textAlign: "center", padding: "16px 28px", flex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", width: "100%", maxWidth: 420
      }}>
        <img src={IMGS.fig_closed} alt="" style={{ width: 64, marginBottom: 16, opacity: 0.9 }} />
        <h2 style={{ color: C.burgundy, fontSize: "clamp(20px, 6vw, 26px)", margin: "0 0 4px", fontWeight: 700 }}>
          What's your name?
        </h2>
        <p style={{ color: C.fig, fontSize: "clamp(14px, 4.5vw, 16px)", margin: "0 0 24px", direction: "rtl" }}>
          ما اسمك؟
        </p>
        <input
          type="text"
          placeholder="Your name · اسمك"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handle()}
          style={{
            width: "100%", padding: "15px 18px", borderRadius: 14,
            border: `2px solid ${C.burgundy}66`, background: C.white,
            fontSize: 16, fontFamily: "Amiri, Georgia, serif",
            color: C.dark, outline: "none", textAlign: "center",
          }}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 20, width: "100%" }}>
          <BtnSecondary onClick={onSkip} style={{ flex: 1 }}>Skip · تخطّ</BtnSecondary>
          <BtnPrimary onClick={handle} style={{ flex: 1 }}>Next · التالي</BtnPrimary>
        </div>
      </div>
    </div>
  );
}

/* ─── CameraScreen ────────────────────────────────────────────────────────── */
function CameraScreen({ onCapture, onBack, hasSession }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState("environment");
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(null);
  const [flipping, setFlipping] = useState(false);

  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 4096 }, height: { ideal: 2160 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError(null);
    } catch {
      setError("Camera access denied or unavailable.\nيرجى السماح بالوصول إلى الكاميرا.");
    }
  }, []);

  useEffect(() => {
    startCamera("environment");
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line

  const flipCamera = async () => {
    if (flipping) return;
    setFlipping(true);
    const newFacing = facing === "environment" ? "user" : "environment";
    setFacing(newFacing);
    await new Promise(r => setTimeout(r, 250));
    await startCamera(newFacing);
    setFlipping(false);
  };

  const fileInputRef = useRef(null);

  const pickFromGallery = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      onCapture(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || !!error) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    let w = v.videoWidth, h = v.videoHeight;
    if (w > 3840) { h = Math.round(h * 3840 / w); w = 3840; }
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (facing === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, w, h);
    setFlash(true);
    setTimeout(() => setFlash(false), 270);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onCapture(dataUrl);
  };

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", flexDirection: "column",
      paddingTop: "env(safe-area-inset-top)"
    }}>
      {flash && <div style={{ position: "absolute", inset: 0, background: "white", opacity: 0.88, zIndex: 10, pointerEvents: "none" }} />}

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `calc(env(safe-area-inset-top) + 12px) 20px 12px`,
        zIndex: 5, background: "linear-gradient(to bottom, #000b, transparent)"
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
          border: "none", borderRadius: 22, color: "white",
          padding: "10px 18px", fontSize: 15, cursor: "pointer",
          minWidth: 72, minHeight: 44
        }}>← Back</button>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, letterSpacing: "0.1em" }}>
          M&amp;S · {today}
        </span>
        <button onClick={flipCamera} disabled={flipping} style={{
          background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
          border: "none", borderRadius: 22, color: "white",
          padding: "10px 14px", fontSize: 22, cursor: flipping ? "not-allowed" : "pointer",
          minWidth: 52, minHeight: 44, opacity: flipping ? 0.5 : 1, transition: "opacity 0.2s"
        }}>⟳</button>
      </div>

      {/* Video */}
      {error ? (
        <div style={{
          flex: 1, color: "white", textAlign: "center",
          padding: "80px 32px 32px", fontFamily: "Amiri, Georgia, serif",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>📷</div>
          <p style={{ fontSize: 16, lineHeight: 1.9, whiteSpace: "pre-line" }}>{error}</p>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}

      {/* Viewfinder */}
      {!error && (
        <div style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 70px)",
          bottom: "calc(env(safe-area-inset-bottom) + 130px)",
          left: 28, right: 28,
          border: "2px solid rgba(255,255,255,0.25)",
          borderRadius: 10, pointerEvents: "none", zIndex: 4
        }}>
          {[["0 auto auto 0","top","left"],["0 0 auto auto","top","right"],
            ["auto auto 0 0","bottom","left"],["auto 0 0 auto","bottom","right"]].map(([pos, v, h], i) => (
            <div key={i} style={{
              position: "absolute", inset: pos, width: 28, height: 28,
              borderTop: v === "top" ? `3px solid ${C.sageLight}` : "none",
              borderBottom: v === "bottom" ? `3px solid ${C.sageLight}` : "none",
              borderLeft: h === "left" ? `3px solid ${C.sageLight}` : "none",
              borderRight: h === "right" ? `3px solid ${C.sageLight}` : "none",
            }} />
          ))}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Shutter */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 40,
        paddingBottom: `max(28px, env(safe-area-inset-bottom))`,
        paddingTop: 20,
        background: "linear-gradient(to top, #000d, transparent)",
        zIndex: 5
      }}>
        <button onClick={() => fileInputRef.current?.click()} style={{
          width: 52, height: 52, borderRadius: 14,
          background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
          border: "2px solid rgba(255,255,255,0.3)", color: "white",
          fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>🖼</button>

        <button onClick={capture} disabled={!!error} style={{
          width: 82, height: 82, borderRadius: "50%", background: "white",
          border: "5px solid rgba(255,255,255,0.35)",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.15)",
          cursor: error ? "not-allowed" : "pointer",
          opacity: error ? 0.4 : 1,
        }} />

        <div style={{ width: 52 }} />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={pickFromGallery}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

/* ─── PreviewScreen ───────────────────────────────────────────────────────── */
function PreviewScreen({ image, onRetake, onConfirm }) {
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0].name);
  const [applying, setApplying] = useState(false);
  const filter = FILTERS.find(f => f.name === selectedFilter) ?? FILTERS[0];

  const handleConfirm = async () => {
    setApplying(true);
    const filtered = await applyFilterToImage(image, filter.value);
    onConfirm(filtered);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", flexDirection: "column" }}>
      {/* Preview image with live CSS filter */}
      <img
        src={image}
        alt="Preview"
        style={{
          flex: 1, objectFit: "contain", width: "100%", minHeight: 0,
          filter: filter.value === "none" ? undefined : filter.value,
        }}
      />

      {/* Filter selector */}
      <div style={{
        display: "flex", overflowX: "auto", gap: 12,
        padding: "12px 16px", background: "#000",
        scrollbarWidth: "none", flexShrink: 0,
      }}>
        {FILTERS.map(f => (
          <div key={f.name} onClick={() => setSelectedFilter(f.name)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
            cursor: "pointer", flexShrink: 0,
          }}>
            <div style={{
              width: 62, height: 62, borderRadius: 10, overflow: "hidden",
              border: selectedFilter === f.name ? `2.5px solid ${C.sageLight}` : "2.5px solid transparent",
              transition: "border-color 0.2s",
            }}>
              <img src={image} alt={f.name} style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: f.value === "none" ? undefined : f.value,
              }} />
            </div>
            <span style={{
              color: selectedFilter === f.name ? C.sageLight : "rgba(255,255,255,0.5)",
              fontSize: 11, fontFamily: "Amiri, Georgia, serif",
              transition: "color 0.2s",
            }}>{f.name}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{
        display: "flex", gap: 16, padding: "12px 28px",
        paddingBottom: `max(28px, env(safe-area-inset-bottom))`,
        justifyContent: "center", flexShrink: 0,
      }}>
        <BtnSecondary onClick={onRetake} style={{ flex: 1, maxWidth: 170, color: "white", borderColor: "rgba(255,255,255,0.55)" }}>
          Retake · أعد
        </BtnSecondary>
        <BtnPrimary onClick={handleConfirm} disabled={applying} style={{ flex: 1, maxWidth: 170 }}>
          Upload · أرسل
        </BtnPrimary>
      </div>
    </div>
  );
}

/* ─── App Root ────────────────────────────────────────────────────────────── */
let toastCounter = 0;

export default function WeddingCamera() {
  const [screen, setScreen]       = useState("welcome");
  const [guestName, setGuestName] = useState("");
  const [image, setImage]         = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const [toasts, setToasts]       = useState([]);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    injectGlobals();
    Promise.all(
      Object.values(IMGS).map(
        src => new Promise(res => { const i = new Image(); i.onload = res; i.onerror = res; i.src = src; })
      )
    ).then(() => setReady(true));
  }, []);

  const addToast = (status, message = "") => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, status, message }]);
    return id;
  };

  const updateToast = (id, status, message = "") => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, status, message } : t));
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleCapture = (dataUrl) => {
    setImage(dataUrl);
    setScreen("preview");
  };

  const handleConfirm = (filteredImage) => {
    setScreen("camera");
    setImage(null);
    const toastId = addToast("uploading");
    uploadToDrive(filteredImage, guestName)
      .then(() => updateToast(toastId, "success"))
      .catch(e => updateToast(toastId, "error", e.message));
  };

  // Back from camera: if session exists go back to name, otherwise welcome
  const handleCameraBack = () => {
    setScreen(hasSession ? "name" : "name");
  };

  const handleNameSubmit = (name) => {
    setGuestName(name);
    setHasSession(true);
    setScreen("camera");
  };

  const handleNameSkip = () => {
    setHasSession(true);
    setScreen("camera");
  };

  if (!ready) return (
    <div style={{
      minHeight: "100dvh", background: C.ivory,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <img src={IMGS.pomegranate} alt="" style={{ width: 64, opacity: 0.5, animation: "spin 1.8s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      {screen === "welcome" && <WelcomeScreen onStart={() => setScreen("name")} />}
      {screen === "name"    && (
        <NameScreen
          onSubmit={handleNameSubmit}
          onSkip={handleNameSkip}
        />
      )}
      {screen === "camera"  && (
        <CameraScreen
          onCapture={handleCapture}
          onBack={handleCameraBack}
          hasSession={hasSession}
        />
      )}
      {screen === "preview" && (
        <PreviewScreen
          image={image}
          onRetake={() => setScreen("camera")}
          onConfirm={handleConfirm}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WeddingCamera />
  </React.StrictMode>
);