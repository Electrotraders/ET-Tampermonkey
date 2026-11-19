// ==UserScript==
// @name         Neto Orders Virtual Filter
// @namespace    Electrotraders
// @author       Electrotraders
// @version      1.2.1
// @grant        none
// @description  Filter Neto orders and line items by Virtual product status with live counts and highlighting
// @match        https://www.electrotraders.com.au/_cpanel/order*
// @match        https://www.electrotraders.com.au/_cpanel/orders*
// @exclude      https://www.electrotraders.com.au/_cpanel/order/*
// @exclude      https://www.electrotraders.com.au/_cpanel/orders/*
// ==/UserScript==

(function() {
    'use strict';

    // Match both /_cpanel/order and /_cpanel/orders (with optional trailing slash), but no sub-paths
    if (!/^\/_cpanel\/orders?\/?$/.test(window.location.pathname)) return;

    const FILTER_MODES = {
        ALL: 'all',
        VIRTUAL_LINES: 'virtual-lines',
        ORDERS_WITH_VIRTUAL: 'orders-with-virtual',
        NON_VIRTUAL_LINES: 'non-virtual-lines'
    };

    const SELECTORS = {
        TARGET_FORM: 'form[name="itemForm"]',
        ORDER_WRAPPER: 'div.order-wrapper',
        LINE_ITEM: 'div.order-line-wrapper > table > tbody > tr:not(.yb-ord-headrow)',
        VIRTUAL_CELL: 'td.yb-col-td.yb-col-cell[data-key="builtin:product:Virtual"]:not(.yb-col-blank)',
        NON_VIRTUAL_CELL: 'td.yb-col-td.yb-col-cell.yb-col-blank[data-key="builtin:product:Virtual"]',
        NETO_SELECT_ALL: '.btn-group.btn-group-selall'
    };

    const BUTTON_DEFS = [
        { mode: FILTER_MODES.ALL, label: 'Show All' },
        { mode: FILTER_MODES.VIRTUAL_LINES, label: 'Show Virtual Lines' },
        { mode: FILTER_MODES.ORDERS_WITH_VIRTUAL, label: 'Show Orders with Virtual' },
        { mode: FILTER_MODES.NON_VIRTUAL_LINES, label: 'Show Non Virtual Lines' }
    ];

    let currentFilter = FILTER_MODES.ALL;
    let observerTimeout = null;

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    function init() {
        injectStyles();
        createControlPanel();
        observeYotabyteInjection();
    }

    function injectStyles() {
        if (document.getElementById('tm-vf-styles')) return;
        const style = document.createElement('style');
        style.id = 'tm-vf-styles';
        style.textContent = `
            tr.tm-vf-virtual-highlight > td {
                background-color: #e8f4fd !important;
            }
            .tm-vf-selall-disabled {
                opacity: 0.45 !important;
                pointer-events: none !important;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);
    }

    function calculateCounts() {
        const orders = Array.from(document.querySelectorAll(SELECTORS.ORDER_WRAPPER));
        let allCount = orders.length;
        let hasVirtualCount = 0;
        let hasNonVirtualCount = 0;

        orders.forEach(order => {
            const lines = Array.from(order.querySelectorAll(SELECTORS.LINE_ITEM));
            if (lines.length === 0) {
                hasVirtualCount++;
                hasNonVirtualCount++;
                return;
            }

            const hasVirtual = lines.some(tr => tr.querySelector(`:scope > ${SELECTORS.VIRTUAL_CELL}`) !== null);
            const hasNonVirtual = lines.some(tr => tr.querySelector(`:scope > ${SELECTORS.NON_VIRTUAL_CELL}`) !== null);

            if (hasVirtual) hasVirtualCount++;
            if (hasNonVirtual) hasNonVirtualCount++;
        });

        return {
            [FILTER_MODES.ALL]: allCount,
            [FILTER_MODES.VIRTUAL_LINES]: hasVirtualCount,
            [FILTER_MODES.ORDERS_WITH_VIRTUAL]: hasVirtualCount,
            [FILTER_MODES.NON_VIRTUAL_LINES]: hasNonVirtualCount
        };
    }

    function updateButtonCounts() {
        const counts = calculateCounts();
        BUTTON_DEFS.forEach(def => {
            const btn = document.querySelector(`#tm-virtual-filter-panel .tm-vf-btn[data-filter="${def.mode}"]`);
            if (btn) {
                btn.textContent = `${def.label} (${counts[def.mode]})`;
            }
        });
    }

    function observeYotabyteInjection() {
        const targetForm = document.querySelector(SELECTORS.TARGET_FORM);
        if (!targetForm) return;

        const observer = new MutationObserver(() => {
            clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                updateButtonCounts();
                if (currentFilter !== FILTER_MODES.ALL) {
                    applyFilter(currentFilter);
                }
            }, 150);
        });

        observer.observe(targetForm, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-key']
        });
    }

    function createControlPanel() {
        if (document.getElementById('tm-virtual-filter-panel')) return;

        const targetForm = document.querySelector(SELECTORS.TARGET_FORM);
        if (!targetForm) return;

        const panel = document.createElement('div');
        panel.id = 'tm-virtual-filter-panel';
        panel.style.cssText = `
            background: #ffffff;
            border: 1px solid #d0d0d0;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.08);
            font-family: Arial, sans-serif;
            display: inline-flex;
            flex-wrap: wrap;
            flex-direction: row;
            gap: 8px;
            align-items: center;
            margin-bottom: 12px;
        `;

        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'Virtual Filter:';
        labelSpan.style.cssText = 'font-size: 12px; font-weight: bold; color: #333; margin-right: 4px;';
        panel.appendChild(labelSpan);

        BUTTON_DEFS.forEach(def => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tm-vf-btn';
            btn.setAttribute('data-filter', def.mode);
            btn.addEventListener('click', () => {
                if (def.mode !== currentFilter) {
                    applyFilter(def.mode);
                }
            });
            panel.appendChild(btn);
        });

        targetForm.parentNode.insertBefore(panel, targetForm);
        updateButtonCounts();
        updateButtonStates();
    }

    function updateButtonStates() {
        const buttons = document.querySelectorAll('#tm-virtual-filter-panel .tm-vf-btn');
        buttons.forEach(btn => {
            const isActive = btn.getAttribute('data-filter') === currentFilter;
            btn.disabled = isActive;

            if (isActive) {
                btn.style.cssText = `
                    background: #007bff;
                    color: #ffffff;
                    border: 1px solid #007bff;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 12px;
                    cursor: default;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
                `;
            } else {
                btn.style.cssText = `
                    background: #f8f9fa;
                    color: #333333;
                    border: 1px solid #cccccc;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-weight: normal;
                    font-size: 12px;
                    cursor: pointer;
                `;
            }
        });
    }

    function toggleNetoSelectAll(disable) {
        const selectAllGroups = document.querySelectorAll(SELECTORS.NETO_SELECT_ALL);
        selectAllGroups.forEach(group => {
            const toggleBtn = group.querySelector('a.dropdown-toggle');
            if (disable) {
                group.classList.remove('open');
                group.classList.add('tm-vf-selall-disabled');
                if (toggleBtn) {
                    toggleBtn.classList.add('disabled');
                    toggleBtn.setAttribute('aria-disabled', 'true');
                }
            } else {
                group.classList.remove('tm-vf-selall-disabled');
                if (toggleBtn) {
                    toggleBtn.classList.remove('disabled');
                    toggleBtn.removeAttribute('aria-disabled');
                }
            }
        });
    }

    function applyFilter(mode) {
        currentFilter = mode;
        updateButtonStates();
        toggleNetoSelectAll(mode !== FILTER_MODES.ALL);

        // 1. Reset all line items (visibility and highlight)
        const allLineItems = document.querySelectorAll(SELECTORS.LINE_ITEM);
        allLineItems.forEach(row => {
            row.hidden = false;
            row.classList.remove('tm-vf-virtual-highlight');
        });

        // 2. Apply line-item visibility / highlighting per mode
        if (mode === FILTER_MODES.VIRTUAL_LINES) {
            document.querySelectorAll(`tr:has(> ${SELECTORS.NON_VIRTUAL_CELL})`)
                .forEach(row => { row.hidden = true; });
        } else if (mode === FILTER_MODES.NON_VIRTUAL_LINES) {
            document.querySelectorAll(`tr:has(> ${SELECTORS.VIRTUAL_CELL})`)
                .forEach(row => { row.hidden = true; });
        } else if (mode === FILTER_MODES.ORDERS_WITH_VIRTUAL) {
            document.querySelectorAll(`tr:has(> ${SELECTORS.VIRTUAL_CELL})`)
                .forEach(row => { row.classList.add('tm-vf-virtual-highlight'); });
        }

        // 3. Evaluate order wrappers
        const orders = document.querySelectorAll(SELECTORS.ORDER_WRAPPER);
        orders.forEach(order => {
            if (mode === FILTER_MODES.ALL) {
                order.hidden = false;
                return;
            }

            const lines = Array.from(order.querySelectorAll(SELECTORS.LINE_ITEM));
            if (lines.length === 0) {
                order.hidden = false;
                return;
            }

            if (mode === FILTER_MODES.ORDERS_WITH_VIRTUAL) {
                const hasVirtual = lines.some(tr => tr.querySelector(`:scope > ${SELECTORS.VIRTUAL_CELL}`) !== null);
                order.hidden = !hasVirtual;
            } else {
                const hiddenCount = lines.filter(tr => tr.hidden).length;
                order.hidden = (hiddenCount === lines.length);
            }
        });
    }
})();