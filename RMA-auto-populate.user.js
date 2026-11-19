// ==UserScript==
// @name         RMA Auto-Populate
// @namespace    Electrotraders
// @author       Electrotraders
// @version      1.0.0
// @grant        none
// @description  Automates RMA form filling in Neto
// @match        https://www.electrotraders.com.au/_cpanel/rma/addrma?order=*
// ==/UserScript==

(function() {
    'use strict';

    if (document.body) {
        createControlPanel();
    } else {
        document.addEventListener('DOMContentLoaded', createControlPanel);
    }

    function createControlPanel() {
        if (document.getElementById('tm-rma-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'tm-rma-panel';
        panel.style.cssText = `
            background: #ffffff;
            border: 1px solid #d0d0d0;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.08);
            font-family: Arial, sans-serif;
            display: inline-flex;
            flex-direction: row;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
        `;

        panel.innerHTML = `
            <button id="tm-all-qty-btn" style="background: #28a745; color: white; border: none; padding: 7px 14px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                All Qty
            </button>
            <div style="display: flex; gap: 8px; align-items: center; border: 2px solid #007bff; padding: 6px 10px; border-radius: 6px; background: #f8f9fa;">
                <select id="tm-reason-select" style="padding: 4px;">
                    <option value="Changed Mind">Changed Mind</option>
                    <option value="Expectations Not Met">Expectations Not Met</option>
                    <option value="Order Mistake" selected>Order Mistake</option>
                    <option value="Ordered Incorrectly">Ordered Incorrectly</option>
                    <option value="Rough Handling/Misuse">Rough Handling/Misuse</option>
                </select>
                <label style="font-size: 12px; font-weight: bold;">Restock %:</label>
                <input type="number" id="tm-pct-input" value="100" style="width: 60px; padding: 4px;" />
                <button id="tm-apply-btn" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Apply
                </button>
            </div>
        `;

        const targetForm = document.querySelector('form[name="itemForm"]');
        if (targetForm) {
            targetForm.parentNode.insertBefore(panel, targetForm);
        }

        document.getElementById('tm-all-qty-btn').addEventListener('click', populateAllQty);
        document.getElementById('tm-apply-btn').addEventListener('click', applyRemainingFields);
    }

    function triggerFrameworkEvents(element) {
        if (!element) return;

        // 1. Dispatch full native DOM event sequence
        const eventTypes = ['focus', 'input', 'change', 'keyup', 'blur'];
        eventTypes.forEach(type => {
            element.dispatchEvent(new Event(type, { bubbles: true }));
        });

        // 2. Dispatch jQuery events if jQuery is present on the page context
        const jq = window.jQuery || window.$;
        if (typeof jq !== 'undefined') {
            jq(element).trigger('input').trigger('change').trigger('keyup').trigger('blur');
        }
    }

    function populateAllQty() {
        const rows = Array.from(document.querySelectorAll('tr.line.rma[ln-component]')).filter(x => x.checkVisibility());

        rows.forEach(row => {
            const qtyInput = row.querySelector('input.input-number.return-qty-input');
            if (qtyInput) {
                const maxQty = qtyInput.getAttribute('max-returns-qty');
                if (maxQty !== null) {
                    qtyInput.value = maxQty;
                    triggerFrameworkEvents(qtyInput);
                }
            }
        });
    }

    function applyRemainingFields() {
        const restockPct = parseFloat(document.getElementById('tm-pct-input').value) || 0;
        const pct = 100.0 - restockPct;
        const selectedReason = document.getElementById('tm-reason-select').value;
        const rows = Array.from(document.querySelectorAll('tr.line.rma[ln-component]')).filter(x => x.checkVisibility());

        rows.forEach((row, index) => {
            const count = index + 1; // 1-based counter for the external table selects

            // 1. Calculate Unit Price
            const spans = row.querySelectorAll('td > span');
            const upResult = Array.from(spans).filter(x => (x.id || '').indexOf("unit_price") >= 0);

            // Clean string of currency symbols before parsing
            const rawPriceText = upResult.length >= 1 ? upResult[0].textContent.replace(/[^0-9.-]+/g, "") : "0";
            const unitPrice = parseFloat(rawPriceText) || 0;

            // 2. Get Quantity
            const qtyInput = row.querySelector('input.input-number.return-qty-input');
            const qty = qtyInput ? parseFloat(qtyInput.value) || 0 : 0;

            // 3. Set Credit Amount
            const creditInput = row.querySelector('.input-price.refund-amount-input');
            if (creditInput) {
                creditInput.value = (unitPrice * qty * (pct / 100)).toFixed(2);
                triggerFrameworkEvents(creditInput);
            }

            // 4. Update Dropdowns
            const reasonSelect = document.querySelector(`table#orderlist select[name="reason${count}"]`);
            if (reasonSelect) {
                reasonSelect.value = selectedReason;
                triggerFrameworkEvents(reasonSelect);
            }

            const outcomeSelect = document.querySelector(`table#orderlist select[name="outcome${count}"]`);
            if (outcomeSelect) {
                outcomeSelect.value = "Return to stock issue credit";
                triggerFrameworkEvents(outcomeSelect);
            }

            const statusSelect = document.querySelector(`table#orderlist select[name="status${count}"]`);
            if (statusSelect) {
                statusSelect.value = "Complete";
                triggerFrameworkEvents(statusSelect);
            }
        });
    }
})();