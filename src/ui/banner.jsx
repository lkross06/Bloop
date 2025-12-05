import ReactDOM from "react-dom/client";

/**
 * Attempts to remove a currently active banner (we can only open one banner at a time)
 * @param {String} id unique id for this banner (so we don't accidentally close other banners)
 * @param {String} force if true, banner is deleted immediately. if false (default), closing animation plays and asynchronously deleted
 * @returns true if successful and there was a banner to close, false otherwise
 */
export function closeBanner(id, force = false){
    try {
        let banner = document.getElementById(String(id));

        //asynchronously remove item after 2 seconds (once animation is done)
        if (!force) {
            banner.firstChild.classList.remove("open");
            setTimeout(
            () => { banner.remove(); },
            2000
            );
        } else {
            banner.remove();
        }

        return true;
    } catch {
        return false;
    }
}
  
/**
* Renders a new banner at the top of the page
* @param {String} id unique id for this banner (so we don't accidentally close other banners)
* @param {*} content JSX HTML content to put in banner
* @param {String} backgroundColor background color for banner
* @param {Number} lifetime ms until the banner is closed, or -1 to stay open indefinitely
*/
export function openBanner(id, content, backgroundColor, lifetime = -1){
    closeBanner(id, true);
  
    //make the span the first child in <body>
    var banner = document.createElement("div");
    banner.setAttribute("id", String(id));
    banner.setAttribute("class", "banner");
    banner.setAttribute("style", "z-index: "
      + String(10 + document.getElementsByClassName("banner").length) //default z-index for banners is 10, but stack on top of any existing banners
    );
    
    document.body.insertBefore(banner, document.body.firstChild);
  
    //render above the page
    ReactDOM.createRoot(banner).render(
      <>
        <div className="banner-container" style={ {"backgroundColor" : String(backgroundColor)} }>
          {content}
        </div>
      </>
    );
  
    //asynchronously start the open slide animation
    setTimeout(() => {
      if (banner.firstChild == null) return;
      banner.firstChild.classList.add("open");
    }, 0);
  
    //asynchronously wait to close
    if (lifetime != -1){
      setTimeout(() => {
        closeBanner(id);
      }, lifetime);
    }
}

/**
 * Opens the login banner
 * @param {function} onClick callback when login button is clicked
 */
export function openLoginBanner(onClick){
  openBanner(
    "login-banner",
    <p>Currently this page is read-only. <span className="login-button" onClick={onClick}>Login</span> to create posts.</p>,
    "indianred"
  );
}