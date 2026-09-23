// ==UserScript==
// @name         Show Orders Status New
// @namespace    Electrotraders
// @author       Electrotraders
// @version      1.0.1
// @grant        none
// @description  In Neto Control Panel will show New orders, if any, on main menu by replicating the menu and badge, so it is more obvious to user
// @match        https://www.electrotraders.com.au/_cpanel*
// ==/UserScript==

(function() {
    'use strict';

    if (document.body) {
        findAndShowNewOrders();
    } else {
        document.addEventListener('DOMContentLoaded', findAndShowNewOrders);
    }

    function findAndShowNewOrders() {
        // Find new order menu item if it has the badge (thus > 0 exist) - Note the 'limitstatus' param indicates the New orders
        const newOrderElement = document.querySelector('a[href="https://www.electrotraders.com.au/_cpanel/order?limitlabel=0&limitstatus=110"]:has(span.badge)');

        if (!newOrderElement) return;

        // Clone and style
        const clone = newOrderElement.cloneNode(true);
        clone.style.marginLeft = "50px";
        clone.style.color = "yellow";

        // Get the parent (1st level menu)
        const parent = newOrderElement.closest("li.parent");

        if (!parent) return;

        // Add cloned element to parent
        parent.after(clone);

    }

})();