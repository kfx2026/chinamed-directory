/* ===== MediChina · 来华就医 通用语言引擎 =====
   用法：元素加 data-key="xxx"；脚本查 SITE_I18N 渲染。
   语言记忆 + 跨页保持（?lang=）+ 阿拉伯语 RTL 自动切换。
*/
(function(){
  var LANGS = ['zh','en','fr','de','es','ru','ko','ar'];
  var RTL = {ar:true};

  function getParam(){
    var m = location.search.match(/[?&]lang=([a-z]{2})/);
    return m ? m[1] : null;
  }
  function getStored(){ try{ return localStorage.getItem('mc_lang'); }catch(e){ return null; } }
  function setStored(l){ try{ localStorage.setItem('mc_lang', l); }catch(e){} }
  function detect(){
    var nav = (navigator.language || 'en').slice(0,2);
    return LANGS.indexOf(nav) >= 0 ? nav : 'en';
  }
  function current(){ return getParam() || getStored() || detect(); }

  function apply(lang){
    if(LANGS.indexOf(lang) < 0) lang = 'en';
    var dict = window.SITE_I18N || {};
    document.querySelectorAll('[data-key]').forEach(function(el){
      var key = el.getAttribute('data-key');
      var t = dict[key];
      if(!t) return;
      var val = t[lang];
      if(val == null) val = t.en;
      if(val == null) return;
      if(el.getAttribute('data-html')) el.innerHTML = val;
      else el.textContent = val;
    });
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', RTL[lang] ? 'rtl' : 'ltr');
    document.body.classList.toggle('rtl', !!RTL[lang]);
    document.querySelectorAll('[data-lang]').forEach(function(b){
      b.classList.toggle('selected', b.getAttribute('data-lang') === lang);
    });
    setStored(lang);
    markActive();
  }

  function persistLinks(lang){
    document.querySelectorAll('a[href]').forEach(function(a){
      var h = a.getAttribute('href') || '';
      if(/^(https?:|mailto:|tel:|#|javascript:)/i.test(h)) return;
      if(h.indexOf('lang=') >= 0) return;
      a.setAttribute('href', h + (h.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + lang);
    });
  }

  function markActive(){
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('[data-nav]').forEach(function(a){
      var nav = a.getAttribute('data-nav');
      var hit = (nav === 'home' && (path === '' || path === 'index.html')) ||
                (nav !== 'home' && path.indexOf(nav) === 0);
      a.classList.toggle('active', hit);
    });
  }

  window.setSiteLang = function(lang){
    apply(lang);
    persistLinks(lang);
    try{
      var url = new URL(location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.toString());
    }catch(e){}
  };

  document.addEventListener('DOMContentLoaded', function(){
    window.setSiteLang(current());
  });
})();
