/*
 * Readify AI（悦读AI）Quantumult X 签到脚本模板
 * ---------------------------------------------------------------
 * ⚠️ 使用前必读：
 * 1. 本脚本为「可填空模板」。接口地址、鉴权头、成功判断字段必须按你自己
 *    抓包结果修改下面「需要你填」的常量，否则无法签到成功。
 * 2. 仅用于本人账号的正常签到自动化学习使用，请遵守 App 用户协议，
 *    不要用于批量薅羊毛、绕过付费或逆向破解。
 * 3. App 接口改版 / 鉴权方式变化后，脚本可能失效，需重新抓包核对。
 *
 * 存储说明：
 *   - 鉴权凭证由配套的 rewrite 捕获脚本写入本地（见 readify_qx_config.conf）
 *   - 也可以手动在 QX 「工具 → 配置脚本 / 变量」里写入，key 见下方 STORAGE_KEY
 * ---------------------------------------------------------------
 */

// ========================= 需要你填（抓包后修改） =========================

// 后端域名，例如 https://api.readify.example.com （去掉末尾斜杠）
const API_BASE = "https://你的后端域名";

// 签到接口路径，例如 /api/v1/check-in 或 /api/sign/daily
const CHECKIN_PATH = "/api/v1/check-in";

// 鉴权头名称：常见为 "Authorization"，部分 App 用 "X-Token" / "Cookie"
const AUTH_HEADER_NAME = "Authorization";

// 鉴权头值前缀：Authorization 一般是 "Bearer "；Cookie 填空字符串 ""
const AUTH_PREFIX = "Bearer ";

// 签到请求方法：POST / GET
const METHOD = "POST";

// 请求体（JSON）。GET 请求置空字符串 ""。
// 若抓包签到需要额外字段（如 device_id、sign、ts），在此补齐。
const BODY = "";

// 成功响应判断（二选一，先按 code 字段判断；没有 code 字段就看 HTTP 状态码）
// 响应 JSON 中表示成功的字段名，例如 "code" / "ret" / "status"；没有就填 ""
const SUCCESS_FIELD = "code";
// 上面字段等于该值视为成功，例如 0 / 200
const SUCCESS_VALUE = 0;

// 本地存储 key（与 rewrite 捕获脚本保持一致即可，一般不用改）
const STORAGE_KEY = "readify_auth_token";

// =========================================================================

function getAuth() {
  return $prefs.valueForKey(STORAGE_KEY) || "";
}

function buildHeaders(token) {
  const headers = {
    "User-Agent": "Readify/3.6.0 (iPhone; iOS 16.4.1; Scale/3.00)",
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers[AUTH_HEADER_NAME] = AUTH_PREFIX + token;
  }
  return headers;
}

function parseBody(resp) {
  let body = resp.body || "";
  try {
    return JSON.parse(body);
  } catch (e) {
    return { _raw: body };
  }
}

function judgeSuccess(resp, json) {
  // 优先看 HTTP 状态码
  if (resp.statusCode < 200 || resp.statusCode >= 300) {
    return { ok: false, reason: "HTTP " + resp.statusCode };
  }
  if (SUCCESS_FIELD && Object.prototype.hasOwnProperty.call(json, SUCCESS_FIELD)) {
    const val = json[SUCCESS_FIELD];
    const ok = String(val) === String(SUCCESS_VALUE);
    return { ok, reason: ok ? "签到成功" : (json.message || json.msg || ("返回 " + SUCCESS_FIELD + "=" + val)) };
  }
  // 无 code 字段时，2xx 即视为成功
  return { ok: true, reason: "请求完成（2xx）" };
}

async function doCheckin() {
  const token = getAuth();
  if (!token) {
    return { ok: false, reason: "未获取到鉴权凭证，请先打开 App 触发一次登录/请求，由 rewrite 捕获后再运行" };
  }

  const options = {
    url: API_BASE + CHECKIN_PATH,
    method: METHOD,
    headers: buildHeaders(token),
  };
  if (BODY && METHOD.toUpperCase() !== "GET") {
    options.body = BODY;
  }

  const resp = await $task.fetch(options);
  const json = parseBody(resp);
  const result = judgeSuccess(resp, json);

  // 提取一段可读信息用于通知（按实际字段调整）
  const detail = json.message || json.msg || json.data?.reward || json._raw || "";
  return { ok: result.ok, reason: result.reason, detail: String(detail).slice(0, 120) };
}

async function main() {
  let title = "悦读AI 签到";
  let subtitle = "";
  let body = "";

  try {
    const r = await doCheckin();
    subtitle = r.ok ? "✅ 成功" : "❌ 失败";
    body = r.reason + (r.detail ? "\n详情：" + r.detail : "");

    // 凭证失效（401/403）时提醒重新捕获
    if (/401|403|未登录|登录过期|token/i.test(body)) {
      body += "\n鉴权已失效，请重新打开 App 登录后让 rewrite 重新捕获。";
    }
  } catch (e) {
    subtitle = "❌ 异常";
    body = String(e && e.message ? e.message : e);
  }

  console.log(`[Readify] ${subtitle} ${body}`);
  $notify(title, subtitle, body);
}

main().finally(() => $done());
