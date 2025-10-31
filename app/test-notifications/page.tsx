"use client";

import { useState } from "react";

export default function NotificationTestPage() {
  const [fid, setFid] = useState("");
  const [appFid, setAppFid] = useState("309857"); // Base App
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState("Bildirim sistemi çalışıyor!");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const sendTestNotification = async () => {
    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: parseInt(fid),
          appFid: parseInt(appFid),
          title,
          body,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(`✅ Başarılı! ${JSON.stringify(data, null, 2)}`);
      } else {
        setResult(`❌ Hata: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      setResult(`❌ Network Hatası: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          🔔 Notification Test
        </h1>

        <div className="space-y-4">
          {/* FID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FID (Farcaster ID)
            </label>
            <input
              type="number"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="Örn: 1076503"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              FID'ni bulmak için:{" "}
              <a
                href="https://warpcast.com/~/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Warpcast Settings
              </a>
            </p>
          </div>

          {/* App FID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App FID
            </label>
            <select
              value={appFid}
              onChange={(e) => setAppFid(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="309857">Base App (309857)</option>
              <option value="1">Farcaster (custom)</option>
            </select>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (max 32 chars)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={32}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/32 characters
            </p>
          </div>

          {/* Body Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body (max 128 chars)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={128}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {body.length}/128 characters
            </p>
          </div>

          {/* Send Button */}
          <button
            onClick={sendTestNotification}
            disabled={loading || !fid}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Gönderiliyor..." : "🚀 Bildirim Gönder"}
          </button>

          {/* Result */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.startsWith("✅")
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Kullanım:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Önce Base App'ten SeersLeague'i favorilerine ekle</li>
            <li>Notifications'ı aktif et</li>
            <li>FID'ni yukarıya gir</li>
            <li>"Bildirim Gönder" butonuna tıkla</li>
            <li>Base App'te bildirimi gör! 🎉</li>
          </ol>
        </div>

        {/* Debug Info */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">🔍 Debug:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              Webhook URL:{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                /api/webhook
              </code>
            </p>
            <p>
              Send API:{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                /api/notifications/send
              </code>
            </p>
            <p>
              Redis Key:{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">
                miniapp:notifications:{fid || "YOUR_FID"}:{appFid}
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
