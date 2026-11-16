/*
 * Readify AI 鉴权凭证捕获脚本（Quantumult X rewrite）
 * ---------------------------------------------------------------
 * 作用：打开 App 触发任意已登录请求时，自动把 token 存入本地，供签到脚本读取。
 * 放置：QX 配置 [rewrite_local] 段，匹配你的后端域名（见 readify_qx_config.conf）。
 * 仅捕获本人账号凭证，请勿外传。
 * ---------------------------------------------------------------
 */

// 与签到脚本保持一致的存储 key
const STORAGE_KEY = "readify_auth_token";

// 响应体里可能出现的 token 字段名（抓包后按需增删）
const TOKEN_BODY_FIELDS = ["token", "access_token", "accessToken", "jwt"];

function saveToken(token) {
  if (token) {
    $prefs.setValueForKey(token, STORAGE_KEY);
    console.log("[Readify] 凭证已捕获并保存");
  }
}

function extractFromHeaders() {
  const headers = $request.headers || {};
  // 兼容大小写
  for (const k of Object.keys(headers)) {
    if (/authorization|x-token|cookie/i.test(k)) {
      let v = headers[k] || "";
      // 去掉 Bearer 前缀后保存；若本身是 Cookie 则整段保存
      v = v.replace(/^Bearer\s+/i, "");
      return v;
    }
  }
  return "";
}

function extractFromBody() {
  try {
    const json = JSON.parse($response.body || "");
    for (const f of TOKEN_BODY_FIELDS) {
      if (json[f]) return String(json[f]);
      if (json.data && json.data[f]) return String(json.data[f]);
    }
  } catch (e) {}
  return "";
}

function main() {
  let token = extractFromHeaders();
  if (!token && typeof $response !== "undefined") {
    token = extractFromBody();
  }
  saveToken(token);
  $done({});
}

main();
