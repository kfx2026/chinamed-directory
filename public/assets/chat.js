/* ===== MediChina Chat Assistant ===== */
(function () {
  var LANGS = ["zh", "en", "fr", "de", "es", "ru", "ko", "ar"];
  var LANG_NAMES = { zh: "中文", en: "English", fr: "Français", de: "Deutsch", es: "Español", ru: "Русский", ko: "한국어", ar: "العربية" };
  var TYPE = {
    zh: ["综合医院", "专科医院"], en: ["General", "Specialty"], fr: ["Général", "Spécialisé"],
    de: ["Allgemein", "Spezial"], es: ["General", "Especializado"], ru: ["Общий", "Специал."],
    ko: ["종합", "전문"], ar: ["عام", "متخصص"]
  };
  var HOSP_FOUND = {
    zh: "为您找到 N 家相关医院", en: "Found N matching hospitals", fr: "N hôpitaux correspondants",
    de: "N passende Krankenhäuser", es: "N hospitales encontrados", ru: "Найдено больниц: N",
    ko: "관련 병원 N곳 찾음", ar: "تم العثور على N مستشفيات"
  };
  var SHORT_DISCLAIMER = {
    zh: "（以上为公开信息，具体诊疗须线下面诊，以医院官方为准）",
    en: "(Public info only; final care requires an in-person visit per the hospital.)",
    fr: "(Infos publiques ; la prise en charge nécessite une visite sur place.)",
    de: "(Nur öffentliche Infos; Behandlung erfordert Vor-Ort-Termin.)",
    es: "(Info pública; la atención requiere visita presencial.)",
    ru: "(Только открытая информация; лечение — очный приём.)",
    ko: "(공개 정보이며 실제 진료는 대면 진료로 결정됩니다.)",
    ar: "(معلومات عامة فقط؛ العلاج يتطلب كشفاً مباشراً.)"
  };

  function curLang() {
    var l = document.documentElement.lang;
    return LANGS.indexOf(l) >= 0 ? l : "en";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var H = window.CHAT_HOSPITALS || [];
  var KB = window.CHAT_KB || { topics: {}, quick: [], keywords: {}, fallback: "" };

  /* ---------- DOM ---------- */
  function build() {
    var fab = document.createElement("button");
    fab.className = "mc-chat-fab mc-unread";
    fab.setAttribute("aria-label", "Chat");
    fab.innerHTML = '🤖<span class="mc-dot"></span>';

    var panel = document.createElement("div");
    panel.className = "mc-chat-panel";
    panel.innerHTML =
      '<div class="mc-chat-head">' +
        '<div class="mc-ava">🤖</div>' +
        '<div class="mc-htx"><div class="mc-htitle">MediChina</div><div class="mc-hsub" data-mc-sub></div></div>' +
        '<button class="mc-close" aria-label="close">×</button>' +
      '</div>' +
      '<div class="mc-chat-lang" data-mc-lang></div>' +
      '<div class="mc-chat-body" data-mc-body></div>' +
      '<div class="mc-quick" data-mc-quick></div>' +
      '<div class="mc-input">' +
        '<textarea rows="1" data-mc-input placeholder="..."></textarea>' +
        '<button data-mc-send>→</button>' +
      '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var body = panel.querySelector("[data-mc-body]");
    var input = panel.querySelector("[data-mc-input]");
    var sendBtn = panel.querySelector("[data-mc-send]");
    var subEl = panel.querySelector("[data-mc-sub]");
    var langEl = panel.querySelector("[data-mc-lang]");
    var quickEl = panel.querySelector("[data-mc-quick]");

    var opened = false, welcomed = false;

    function refreshMeta() {
      var l = curLang();
      subEl.textContent = (KB.topics.welcome && KB.topics.welcome.title[l]) || "Assistant";
      langEl.textContent = (LANG_NAMES[l] || "English");
      var ph = { zh: "输入您的问题…", en: "Type your question…", fr: "Écrivez votre question…", de: "Frage eingeben…", es: "Escriba su pregunta…", ru: "Введите вопрос…", ko: "질문을 입력하세요…", ar: "اكتب سؤالك…" }[l] || "Type your question…";
      input.setAttribute("placeholder", ph);
      // re-render quick labels
      quickEl.innerHTML = "";
      (KB.quick || []).forEach(function (q) {
        var b = document.createElement("button");
        b.textContent = q.label[l] || q.label.en;
        b.onclick = function () { botSay(q.key); };
        quickEl.appendChild(b);
      });
    }

    function scroll() { body.scrollTop = body.scrollHeight; }

    function addMsg(role, text) {
      var d = document.createElement("div");
      d.className = "mc-msg " + (role === "user" ? "mc-user" : "mc-bot");
      d.textContent = text;
      body.appendChild(d); scroll();
    }
    function addHtml(html) {
      var d = document.createElement("div");
      d.className = "mc-msg mc-bot";
      d.innerHTML = html;
      body.appendChild(d); scroll();
    }
    function linkBtn(href, label) {
      return '<a class="mc-link" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
    }
    function viewLabel(l) {
      return { zh: "查看详情 →", en: "View details →", fr: "Voir →", de: "Mehr →", es: "Ver →", ru: "Подробнее →", ko: "자세히 →", ar: "عرض →" }[l] || "View details →";
    }

    function botSay(key) {
      var t = KB.topics[key];
      if (!t) return;
      var l = curLang();
      var html = '<div>' + esc(t.body[l] || t.body.en) + '</div>';
      if (t.link) html += linkBtn(t.link + "?lang=" + l, viewLabel(l));
      addHtml(html);
    }

    function botHospitals(list) {
      var l = curLang();
      var n = list.length;
      var title = (HOSP_FOUND[l] || HOSP_FOUND.en).replace("N", n);
      var html = '<div class="mc-msg mc-hosp"><div class="mc-hosp-h">' + esc(title) + '</div>';
      list.forEach(function (h) {
        var idx = h.type === "specialty" ? 1 : 0;
        var tl = (TYPE[l] || TYPE.en)[idx];
        var main = (l === "zh") ? h.name_zh : h.name_en;
        var sub = (l === "zh") ? h.name_en : h.name_zh;
        var city = (l === "zh") ? h.city_zh : h.city_en;
        var specs = (l === "zh") ? h.specs_zh : h.specs_en;
        html += '<div class="mc-hosp-item">' +
          '<div class="mc-hname">' + esc(main) + '<span class="en">' + esc(sub) + '</span></div>' +
          '<div class="mc-hmeta">' + esc(city) + ' · ' + esc(tl) + '</div>' +
          '<div>' + (specs || []).map(function (s) { return '<span class="mc-htag">' + esc(s) + '</span>'; }).join("") + '</div>' +
          '</div>';
      });
      html += '</div>';
      addHtml(html);
      addHtml('<div>' + esc(SHORT_DISCLAIMER[l] || SHORT_DISCLAIMER.en) + '</div>' + linkBtn("consult.html?lang=" + l, (KB.topics.contact ? viewLabel(l) : "→")));
    }

    function searchHospitals(q) {
      var stop = ["吗", "呢", "的", "我", "想", "去", "看", "病", "什么", "哪个", "推荐", "请问", "哪些", "有", "哪家", "怎么", "如何", "可以", "需要", "你们", "我们", "医院", "科室", "合作", "三甲", "帮助",
        "help", "me", "i", "want", "to", "a", "the", "in", "for", "and", "or", "my", "of", "is", "are", "can", "you", "your", "hospital", "hospitals", "clinic", "clinics", "department", "recommend", "recommended", "which", "what", "how", "best", "top", "good", "please", "3a", "find", "list"];
      var toks = q.toLowerCase().split(/[\s,，。、？?！!；;：:+]+/).map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length >= 2 && stop.indexOf(s) < 0; });
      if (!toks.length || !H.length) return [];
      var hits = [];
      H.forEach(function (h) {
        var hay = (h.specs_zh.join(" ") + " " + h.specs_en.join(" ") + " " + h.city_zh + " " + h.city_en + " " + h.name_zh + " " + h.name_en).toLowerCase();
        var score = 0;
        toks.forEach(function (t) { if (hay.indexOf(t) >= 0) score++; });
        if (score > 0) hits.push({ h: h, score: score });
      });
      hits.sort(function (a, b) { return b.score - a.score; });
      return hits.slice(0, 8).map(function (x) { return x.h; });
    }

    function matchTopic(text) {
      var l = curLang();
      var low = text.toLowerCase();
      var ks = KB.keywords || {};
      var order = ["process", "services", "fees", "hospital", "travel", "tcm", "cases", "contact", "disclaimer"];
      for (var i = 0; i < order.length; i++) {
        var k = order[i];
        if (!ks[k]) continue;
        var arr = (ks[k][l] || []).concat(ks[k]["en"] || []);
        for (var j = 0; j < arr.length; j++) {
          if (arr[j] && low.indexOf(String(arr[j]).toLowerCase()) >= 0) return k;
        }
      }
      return null;
    }

    function handle(text) {
      if (!text.trim()) return;
      addMsg("user", text);
      var hits = searchHospitals(text);
      if (hits.length) { botHospitals(hits); return; }
      var k = matchTopic(text);
      if (k) { botSay(k); return; }
      // fallback
      var l = curLang();
      addMsg("bot", KB.fallback[l] || KB.fallback.en || "...");
    }

    function openPanel() {
      if (opened) { panel.classList.remove("mc-open"); opened = false; return; }
      panel.classList.add("mc-open"); opened = true;
      fab.classList.remove("mc-unread");
      if (!welcomed) { welcomed = true; botSay("welcome"); }
      setTimeout(scroll, 50);
    }

    fab.onclick = openPanel;
    panel.querySelector(".mc-close").onclick = openPanel;
    sendBtn.onclick = function () { handle(input.value); input.value = ""; input.style.height = "auto"; };
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handle(input.value); input.value = ""; input.style.height = "auto"; }
    });
    input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 80) + "px"; });

    // language change -> refresh meta + quick labels
    var mo = new MutationObserver(function () { refreshMeta(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    refreshMeta();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
