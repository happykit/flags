// Based heavily on various answers given in
// http://stackoverflow.com/questions/179355/clearing-all-cookies-with-javascript

function clearAllPaths(window: Window, cookieBase: string) {
  var p = window.location.pathname.split("/");
  window.document.cookie = cookieBase + "; path=/";
  while (p.length > 0) {
    window.document.cookie = cookieBase + "; path=" + p.join("/");
    p.pop();
  }
}

export function deleteAllCookies(window: Window) {
  var cookies = window.document.cookie.split("; ");
  for (var c = 0; c < cookies.length; c++) {
    var encodedCookieName = encodeURIComponent(
      cookies[c].split(";")[0].split("=")[0]
    );
    var cookieBase =
      encodedCookieName + "=; expires=Thu, 01-Jan-1970 00:00:01 GMT";
    clearAllPaths(window, cookieBase);

    var d = window.location.hostname.split(".");
    while (d.length > 0) {
      clearAllPaths(window, cookieBase + "; domain=" + d.join("."));
      d.shift();
    }
  }
}
