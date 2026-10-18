
/* =========================================================
   VAULTLY — Your Money, Beautifully Managed
   Main JavaScript
   ========================================================= */

"use strict";

// ---------------------------------------------------------
// 1. STORAGE AND APP DATA
// ---------------------------------------------------------

const STORAGE_KEY = "vaultly-app-data-v1";

const defaultData = {
    transactions: [],
    goals: [],
    monthlyBudget: 15000,
    points: 0,
    badges: [],
    activityDates: [],
    bestStreak: 0,
    soundEnabled: false
};

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { ...defaultData };

        const parsed = JSON.parse(saved);

        return {
            ...defaultData,
            ...parsed,
            transactions: Array.isArray(parsed.transactions)
                ? parsed.transactions : [],
            goals: Array.isArray(parsed.goals)
                ? parsed.goals : [],
            badges: Array.isArray(parsed.badges)
                ? parsed.badges : [],
            activityDates: Array.isArray(parsed.activityDates)
                ? parsed.activityDates : []
        };
    } catch (error) {
        console.error("Could not load Vaultly data:", error);
        return { ...defaultData };
    }
}

let appData = loadData();

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        return true;
    } catch (error) {
        console.error("Could not save Vaultly data:", error);
        showToast("Unable to save. Check your browser storage.", "error");
        return false;
    }
}

// ---------------------------------------------------------
// 2. HELPERS
// ---------------------------------------------------------

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const money = (amount) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
}).format(Number(amount) || 0);

const shortMoney = (amount) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
}).format(Number(amount) || 0);

const todayString = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString + "T12:00:00");
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function showToast(message, type = "success") {
    const container = $("#toastContainer");
    if (!container) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => toast.remove(), 3500);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setWidth(id, percentage) {
    const element = document.getElementById(id);

    if (element) {
        element.style.width =
            `${Math.max(0, Math.min(100, percentage))}%`;
    }
}

function getTransactionsForPeriod(period = "all") {
    const now = new Date();

    return appData.transactions.filter(transaction => {
        const date = new Date(transaction.date + "T12:00:00");
        if (Number.isNaN(date.getTime())) return false;

        if (period === "all") return true;

        if (period === "month") {
            return date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        }

        if (period === "year") {
            return date.getFullYear() === now.getFullYear();
        }

        if (period === "week") {
            const start = new Date(now);
            const weekday = (now.getDay() + 6) % 7;

            start.setDate(now.getDate() - weekday);
            start.setHours(0, 0, 0, 0);

            const end = new Date(start);
            end.setDate(start.getDate() + 7);

            return date >= start && date < end;
        }

        return true;
    });
}

function calculateTotals(transactions) {
    const income = transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const expenses = transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
        income,
        expenses,
        savings: income - expenses,
        balance: income - expenses
    };
}

function sortedTransactions(transactions) {
    return [...transactions].sort((a, b) => {
        const difference = b.date.localeCompare(a.date);
        return difference || (b.createdAt || 0) - (a.createdAt || 0);
    });
}

// ---------------------------------------------------------
// 3. TOAST AND OPTIONAL SOUND
// ---------------------------------------------------------

let audioContext;

function playSound(kind = "click") {
    if (!appData.soundEnabled) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        audioContext ||= new AudioContextClass();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = "sine";
        oscillator.frequency.value = kind === "success" ? 880 : 520;

        gain.gain.setValueAtTime(0.035, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001, audioContext.currentTime + 0.09
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.09);
    } catch (error) {
        console.warn("Sound is unavailable:", error);
    }
}

function updateSoundButton() {
    const button = $("#soundToggle");
    if (!button) return;

    button.textContent = appData.soundEnabled ? "♫" : "♪";
    button.setAttribute("aria-pressed", String(appData.soundEnabled));
    button.title = appData.soundEnabled
        ? "Turn sounds off" : "Turn sounds on";
}

// ---------------------------------------------------------
// 4. NAVIGATION
// ---------------------------------------------------------

const pageNames = {
    overview: {
        id: "overviewPage",
        title: "Your money, in flow."
    },
    transactions: {
        id: "transactionsPage",
        title: "Every transaction, clearly."
    },
    insights: {
        id: "insightsPage",
        title: "Clarity changes everything."
    },
    goals: {
        id: "goalsPage",
        title: "Your future, your way."
    },
    "money-story": {
        id: "money-storyPage",
        title: "Your Money Story."
    },
    quests: {
        id: "questsPage",
        title: "Small quests. Stronger habits."
    }
};

function navigateTo(page) {
    if (!pageNames[page]) return;

    $$(".page-section").forEach(section => {
        section.classList.remove("active");
        section.hidden = true;
    });

    const target = document.getElementById(pageNames[page].id);

    if (target) {
        target.hidden = false;
        target.classList.add("active");
    }

    $$(".nav-item").forEach(button => {
        const active = button.dataset.page === page;
        button.classList.toggle("active", active);

        if (active) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    setText("pageTitle", pageNames[page].title);
    $("#sidebar")?.classList.remove("open");

    if (page === "insights") renderInsights();
    if (page === "goals") renderGoals();
    if (page === "money-story") renderMoneyStory();
    if (page === "quests") renderQuests();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
    $$(".nav-item, [data-page]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.page);
            playSound();
        });
    });

    $("#menuToggle")?.addEventListener("click", () => {
        $("#sidebar")?.classList.toggle("open");
    });

    $(".brand")?.addEventListener("click", event => {
        event.preventDefault();
        navigateTo("overview");
    });

    $("#profileButton")?.addEventListener("click", () => {
        showToast("Welcome to your personal Vault.");
    });
}

// ---------------------------------------------------------
// 5. TRANSACTION DIALOG
// ---------------------------------------------------------

const transactionModal = $("#transactionModal");
const transactionForm = $("#transactionForm");

function openTransactionModal(transaction = null) {
    if (!transactionForm || !transactionModal) return;

    transactionForm.reset();

    setText(
        "transactionModalTitle",
        transaction ? "Edit transaction" : "Add transaction"
    );

    $("#transactionId").value = transaction?.id || "";
    $("#transactionTitle").value = transaction?.title || "";
    $("#transactionAmount").value = transaction?.amount ?? "";
    $("#transactionDate").value = transaction?.date || todayString();
    $("#transactionCategory").value = transaction?.category || "Food";
    $("#transactionPayment").value = transaction?.payment || "UPI";
    $("#transactionNote").value = transaction?.note || "";

    const radio = $(
        `input[name="transactionType"][value="${transaction?.type || "expense"}"]`
    );

    if (radio) radio.checked = true;

    const error = $("#transactionFormError");
    if (error) {
        error.hidden = true;
        error.textContent = "";
    }

    transactionModal.hidden = false;
    document.body.classList.add("modal-open");

    window.setTimeout(() => $("#transactionTitle")?.focus(), 50);
}

function closeTransactionModal() {
    if (transactionModal) transactionModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function showFormError(id, message) {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = message;
    element.hidden = false;
}

function markActivity() {
    const today = todayString();

    if (!appData.activityDates.includes(today)) {
        appData.activityDates.push(today);
    }

    appData.activityDates.sort();
    updateBestStreak();
}

function updateBestStreak() {
    const dates = [...new Set(appData.activityDates)].sort();

    let current = 0;
    let best = 0;
    let previous = null;

    for (const dateString of dates) {
        const date = new Date(dateString + "T12:00:00");

        if (previous) {
            const difference = Math.round(
                (date - previous) / 86400000
            );
            current = difference === 1 ? current + 1 : 1;
        } else {
            current = 1;
        }

        best = Math.max(best, current);
        previous = date;
    }

    appData.bestStreak = Math.max(appData.bestStreak || 0, best);
}

function addPoints(amount) {
    appData.points = (Number(appData.points) || 0) + amount;
}

function saveTransaction(event) {
    event.preventDefault();

    const id = $("#transactionId").value;
    const title = $("#transactionTitle").value.trim();
    const amount = Number($("#transactionAmount").value);
    const date = $("#transactionDate").value;
    const type = $('input[name="transactionType"]:checked')?.value;

    if (!title || title.length > 80) {
        showFormError("transactionFormError",
            "Please enter a valid transaction name.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0 ||
        amount > 1000000000000) {
        showFormError("transactionFormError",
            "Enter an amount greater than zero.");
        return;
    }

    if (!date || date > todayString()) {
        showFormError("transactionFormError",
            "Please choose today or an earlier date.");
        return;
    }

    const existing = appData.transactions.find(item => item.id === id);

    const transaction = {
        id: id || window.crypto?.randomUUID?.() ||
            `${Date.now()}-${Math.random()}`,
        title,
        amount,
        date,
        type: type || "expense",
        category: $("#transactionCategory").value,
        payment: $("#transactionPayment").value,
        note: $("#transactionNote").value.trim(),
        createdAt: existing?.createdAt || Date.now()
    };

    if (existing) {
        appData.transactions = appData.transactions.map(item =>
            item.id === id ? transaction : item
        );
    } else {
        appData.transactions.push(transaction);
        markActivity();
        addPoints(10);
    }

    if (!saveData()) return;

    closeTransactionModal();
    renderApp();

    showToast(existing
        ? "Transaction updated successfully."
        : "Transaction added successfully.");

    playSound("success");
}

function deleteTransaction(id) {
    const transaction = appData.transactions.find(item => item.id === id);
    if (!transaction) return;

    if (!window.confirm(
        `Delete "${transaction.title}"? This cannot be undone.`
    )) return;

    appData.transactions = appData.transactions.filter(
        item => item.id !== id
    );

    if (!saveData()) return;

    renderApp();
    showToast("Transaction deleted.");
}

function setupTransactionForm() {
    $("#addTransactionButton")?.addEventListener(
        "click", () => openTransactionModal()
    );

    $("#emptyAddButton")?.addEventListener(
        "click", () => openTransactionModal()
    );

    $$("[data-open-transaction]").forEach(button => {
        button.addEventListener("click", () => openTransactionModal());
    });

    $("#closeTransactionModal")?.addEventListener(
        "click", closeTransactionModal
    );

    $("#cancelTransactionButton")?.addEventListener(
        "click", closeTransactionModal
    );

    transactionForm?.addEventListener("submit", saveTransaction);

    transactionModal?.addEventListener("click", event => {
        if (event.target === transactionModal) closeTransactionModal();
    });

    $("#soundToggle")?.addEventListener("click", () => {
        appData.soundEnabled = !appData.soundEnabled;

        if (!saveData()) {
            appData.soundEnabled = !appData.soundEnabled;
            return;
        }

        updateSoundButton();

        if (appData.soundEnabled) playSound("success");

        showToast(appData.soundEnabled
            ? "Sounds enabled." : "Sounds disabled.");
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeTransactionModal();
            closeGoalModal();
        }
    });
}

// ---------------------------------------------------------
// 6. TRANSACTION LISTS
// ---------------------------------------------------------

function transactionMarkup(transaction) {
    const isIncome = transaction.type === "income";
    const symbol = isIncome ? "+" : "−";

    return `
        <div class="transaction-item">
            <div class="transaction-leading ${isIncome ? "income-icon" : "expense-icon"}">
                ${isIncome ? "↙" : "↗"}
            </div>

            <div class="transaction-main">
                <strong>${escapeHTML(transaction.title)}</strong>
                <span>${escapeHTML(transaction.category)} · ${formatDate(transaction.date)}</span>
            </div>

            <div class="transaction-trailing">
                <strong class="${isIncome ? "income-text" : "expense-text"}">
                    ${symbol}${money(transaction.amount)}
                </strong>
                <span>${escapeHTML(transaction.payment || "")}</span>
            </div>

            <div class="transaction-actions">
                <button type="button"
                    data-edit-transaction="${escapeHTML(transaction.id)}">
                    Edit
                </button>
                <button type="button"
                    data-delete-transaction="${escapeHTML(transaction.id)}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function emptyTransactionsMarkup(message) {
    return `
        <div class="empty-state">
            <span class="empty-state-icon">✧</span>
            <h4>${escapeHTML(message)}</h4>
            <p>Your recorded activity will appear here.</p>
        </div>
    `;
}

function bindTransactionActions(container) {
    if (!container) return;

    container.querySelectorAll("[data-edit-transaction]").forEach(button => {
        button.addEventListener("click", () => {
            const transaction = appData.transactions.find(
                item => item.id === button.dataset.editTransaction
            );

            if (transaction) openTransactionModal(transaction);
        });
    });

    container.querySelectorAll("[data-delete-transaction]").forEach(button => {
        button.addEventListener("click", () => {
            deleteTransaction(button.dataset.deleteTransaction);
        });
    });
}

function renderRecentTransactions() {
    const container = $("#recentTransactions");
    if (!container) return;

    const recent = sortedTransactions(
        getTransactionsForPeriod($("#dashboardPeriod")?.value || "month")
    ).slice(0, 5);

    if (!recent.length) {
        container.innerHTML = emptyTransactionsMarkup(
            "Your story starts here."
        );

        const button = document.createElement("button");
        button.className = "secondary-button";
        button.textContent = "Add your first transaction";
        button.addEventListener("click", () => openTransactionModal());

        container.querySelector(".empty-state")?.appendChild(button);
        return;
    }

    container.innerHTML = recent.map(transactionMarkup).join("");
    bindTransactionActions(container);
}

function updateCategoryFilter() {
    const select = $("#transactionCategoryFilter");
    if (!select) return;

    const currentValue = select.value;
    const categories = [
        ...new Set(appData.transactions.map(item => item.category))
    ].sort();

    select.innerHTML =
        '<option value="all">All categories</option>' +
        categories.map(category =>
            `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
        ).join("");

    if (categories.includes(currentValue)) select.value = currentValue;
}

function renderAllTransactions() {
    const container = $("#allTransactions");
    if (!container) return;

    updateCategoryFilter();

    const query = ($("#transactionSearch")?.value || "").toLowerCase();
    const type = $("#transactionTypeFilter")?.value || "all";
    const category = $("#transactionCategoryFilter")?.value || "all";

    const filtered = sortedTransactions(appData.transactions).filter(item => {
        const matchesSearch = [
            item.title, item.category, item.payment, item.note
        ].some(value => String(value || "").toLowerCase().includes(query));

        return matchesSearch &&
            (type === "all" || item.type === type) &&
            (category === "all" || item.category === category);
    });

    if (!filtered.length) {
        container.innerHTML = emptyTransactionsMarkup(
            appData.transactions.length
                ? "No matching transactions."
                : "No transactions yet."
        );
        return;
    }

    container.innerHTML = filtered.map(transactionMarkup).join("");
    bindTransactionActions(container);
}

function setupTransactionFilters() {
    $("#transactionSearch")?.addEventListener(
        "input", renderAllTransactions
    );

    $("#transactionTypeFilter")?.addEventListener(
        "change", renderAllTransactions
    );

    $("#transactionCategoryFilter")?.addEventListener(
        "change", renderAllTransactions
    );

    $("#dashboardPeriod")?.addEventListener("change", () => {
        renderDashboard();
        renderRecentTransactions();
    });
}

// ---------------------------------------------------------
// 7. DASHBOARD AND FLOWLINE
// ---------------------------------------------------------

function renderDashboard() {
    const period = $("#dashboardPeriod")?.value || "month";
    const transactions = getTransactionsForPeriod(period);
    const totals = calculateTotals(transactions);

    setText("totalBalance", money(totals.balance));
    setText("totalIncome", money(totals.income));
    setText("totalExpenses", money(totals.expenses));
    setText("netSavings", money(totals.savings));

    setText("flowIncome", shortMoney(totals.income));
    setText("flowExpenses", shortMoney(totals.expenses));
    setText("flowSavings", shortMoney(totals.savings));

    renderBudget();
    renderRecentTransactions();
    renderMotivation();
    renderHighlight(transactions, totals);
}

function renderBudget() {
    const monthTransactions = getTransactionsForPeriod("month");

    const expenses = monthTransactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const budget = Math.max(0, Number(appData.monthlyBudget) || 0);
    const remaining = budget - expenses;
    const percentage = budget > 0 ? expenses / budget * 100 : 0;

    setText("budgetSpent", shortMoney(expenses));
    setText("budgetSpentLegend", shortMoney(expenses));
    setText("budgetRemaining", shortMoney(remaining));

    setText("budgetPercentage",
        budget > 0 ? `${Math.round(percentage)}% used` : "Set a budget");

    const ring = $("#budgetRing");

    if (ring) {
        const progress = Math.min(100, percentage);

        ring.style.background = budget > 0
            ? `conic-gradient(#8B668B ${progress}%, #E9E1D8 ${progress}% 100%)`
            : "#E9E1D8";

        ring.setAttribute("aria-label",
            `${Math.round(percentage)} percent of monthly budget used`);
    }
}

function renderHighlight(transactions, totals) {
    if (!transactions.length) {
        setText("highlightTitle",
            "Your financial story starts with awareness.");
        setText("highlightMessage",
            "Add transactions to discover patterns and get helpful suggestions based on your own activity.");
        return;
    }

    setText("highlightTitle", totals.savings >= 0
        ? "You're keeping more money than you're spending."
        : "Let's bring your spending back into focus.");

    setText("highlightMessage", totals.savings >= 0
        ? `Your recorded income exceeds your expenses by ${money(totals.savings)} for this period. Keep reviewing your choices and goals.`
        : `Your recorded expenses exceed income by ${money(Math.abs(totals.savings))} for this period. Review your spending categories and budget.`);
}

function renderMotivation() {
    const streak = getCurrentStreak();
    const points = Number(appData.points) || 0;
    const level = Math.floor(points / 100) + 1;

    const levelNames = [
        "Beginner", "Explorer", "Planner", "Builder",
        "Achiever", "Wealth Weaver", "Vault Master"
    ];

    const name = levelNames[Math.min(level - 1, levelNames.length - 1)];
    const pointsInLevel = points % 100;

    setText("trackingStreak", `${streak} day${streak === 1 ? "" : "s"} streak`);
    setText("streakCaption", streak > 0
        ? "Every check-in helps build a habit."
        : "Start building your tracking habit.");

    setText("userLevel", `Level ${level} · ${name}`);
    setText("userPoints", `${points} XP`);
    setWidth("levelProgressFill", pointsInLevel);
    setText("nextLevelText", `${100 - pointsInLevel} XP until your next level`);

    setText("motivationMessage", appData.transactions.length
        ? "You're making your money visible, one thoughtful choice at a time."
        : "You don't need to be perfect with money. You just need a place to begin.");
}

function getCurrentStreak() {
    const dates = [...new Set(appData.activityDates)].sort().reverse();
    if (!dates.length) return 0;

    const today = new Date(todayString() + "T12:00:00");
    const latest = new Date(dates[0] + "T12:00:00");
    const age = Math.round((today - latest) / 86400000);

    if (age > 1) return 0;

    let streak = 1;

    for (let index = 1; index < dates.length; index++) {
        const current = new Date(dates[index - 1] + "T12:00:00");
        const previous = new Date(dates[index] + "T12:00:00");
        const difference = Math.round((current - previous) / 86400000);

        if (difference === 1) streak++;
        else break;
    }

    return streak;
}

// ---------------------------------------------------------
// 8. BUDGET AND WHAT-IF STUDIO
// ---------------------------------------------------------

function renderInsights() {
    const budgetInput = $("#monthlyBudgetInput");

    if (budgetInput && document.activeElement !== budgetInput) {
        budgetInput.value = appData.monthlyBudget || "";
    }

    updateWhatIf();
    renderInsightCard();
}

function setupInsights() {
    $("#saveBudgetButton")?.addEventListener("click", () => {
        const budget = Number($("#monthlyBudgetInput")?.value);

        if (!Number.isFinite(budget) || budget < 0 ||
            budget > 1000000000000) {
            showToast("Enter a valid monthly budget.", "error");
            return;
        }

        const previousBudget = appData.monthlyBudget;
        appData.monthlyBudget = budget;

        if (!saveData()) {
            appData.monthlyBudget = previousBudget;
            return;
        }

        renderBudget();
        renderInsights();
        showToast("Monthly budget saved.");
        playSound("success");
    });

    $("#whatIfAmount")?.addEventListener("input", updateWhatIf);
}

function updateWhatIf() {
    const amount = Math.max(0, Number($("#whatIfAmount")?.value) || 0);
    setText("whatIfMonth", money(amount * 4));
    setText("whatIfYear", money(amount * 52));
}

function renderInsightCard() {
    const transactions = getTransactionsForPeriod("month");
    const expenses = transactions.filter(item => item.type === "expense");
    const totals = calculateTotals(transactions);

    let title = "Your patterns, made clearer.";
    let message = "Record some transactions to receive helpful observations about your activity.";

    if (transactions.length) {
        if (totals.savings < 0) {
            title = "Your expenses are higher than your income.";
            message = "Review your recent spending and consider adjusting flexible expenses.";
        } else {
            title = "You're building financial awareness.";
            message = `Your net result this month is ${money(totals.savings)}.`;
        }

        if (expenses.length) {
            const categoryTotals = {};

            expenses.forEach(item => {
                categoryTotals[item.category] =
                    (categoryTotals[item.category] || 0) + Number(item.amount);
            });

            const topCategory = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])[0];

            if (topCategory) {
                message += ` Your largest recorded expense category is ${topCategory[0]} (${money(topCategory[1])}).`;
            }
        }
    }

    const budget = Number(appData.monthlyBudget) || 0;

    if (budget > 0 && totals.expenses > budget) {
        title = "You've passed your monthly budget.";
        message = `Expenses are ${money(totals.expenses - budget)} above your recorded monthly limit.`;
    }

    setText("insightCardTitle", title);
    setText("insightCardMessage", message);
}

// ---------------------------------------------------------
// 9. SAVINGS GOALS — FIXED CONTRIBUTION SYSTEM
// ---------------------------------------------------------

const goalModal = $("#goalModal");
const goalForm = $("#goalForm");

function openGoalModal() {
    if (!goalForm || !goalModal) {
        showToast("The goal form could not be found.", "error");
        return;
    }

    goalForm.reset();

    const initialAmount = $("#goalInitialAmount");
    if (initialAmount) initialAmount.value = "0";

    const error = $("#goalFormError");
    if (error) {
        error.hidden = true;
        error.textContent = "";
    }

    goalModal.hidden = false;
    document.body.classList.add("modal-open");

    window.setTimeout(() => $("#goalName")?.focus(), 50);
}

function closeGoalModal() {
    if (goalModal) goalModal.hidden = true;
    document.body.classList.remove("modal-open");
}

function setupGoals() {
    $("#addGoalButton")?.addEventListener("click", openGoalModal);
    $("#createGoalFromCard")?.addEventListener("click", openGoalModal);

    $("#closeGoalModal")?.addEventListener("click", closeGoalModal);
    $("#cancelGoalButton")?.addEventListener("click", closeGoalModal);

    goalModal?.addEventListener("click", event => {
        if (event.target === goalModal) closeGoalModal();
    });

    // CREATE A SAVINGS GOAL
    goalForm?.addEventListener("submit", event => {
        event.preventDefault();

        const name = $("#goalName")?.value.trim();
        const target = Number($("#goalTarget")?.value);
        const saved = Number($("#goalInitialAmount")?.value);
        const date = $("#goalDate")?.value || "";

        const error = $("#goalFormError");
        if (error) {
            error.hidden = true;
            error.textContent = "";
        }

        if (!name || name.length > 70) {
            showFormError("goalFormError", "Enter a valid goal name.");
            return;
        }

        if (!Number.isFinite(target) || target <= 0 ||
            target > 1000000000000) {
            showFormError("goalFormError", "Enter a valid target amount.");
            return;
        }

        if (!Number.isFinite(saved) || saved < 0 || saved > target) {
            showFormError(
                "goalFormError",
                "Your saved amount must be between zero and your target."
            );
            return;
        }

        if (date && date < todayString()) {
            showFormError(
                "goalFormError",
                "Choose today or a future target date."
            );
            return;
        }

        const goal = {
            id: window.crypto?.randomUUID?.() ||
                `${Date.now()}-${Math.random()}`,
            name,
            target,
            saved,
            date
        };

        appData.goals.push(goal);
        markActivity();
        addPoints(15);

        if (!saveData()) {
            appData.goals = appData.goals.filter(item => item.id !== goal.id);
            appData.points = Math.max(0, appData.points - 15);
            return;
        }

        closeGoalModal();
        renderApp();

        showToast("Your new savings goal is ready.");
        playSound("success");
    });

    /*
       IMPORTANT:
       There is ONE delegated click handler for goal actions.
       Do not add another contribution handler elsewhere.
    */
    const goalsContainer = $("#goalsList");

    goalsContainer?.addEventListener("click", event => {
        const clickedElement = event.target;

        if (!(clickedElement instanceof Element)) return;

        const contributeButton = clickedElement.closest(
            "[data-contribute-goal]"
        );

        const deleteButton = clickedElement.closest(
            "[data-delete-goal]"
        );

        if (!contributeButton && !deleteButton) return;

        event.preventDefault();

        const isDelete = Boolean(deleteButton);
        const button = isDelete ? deleteButton : contributeButton;
        const goalId = isDelete
            ? button.dataset.deleteGoal
            : button.dataset.contributeGoal;

        const goal = appData.goals.find(
            item => String(item.id) === String(goalId)
        );

        if (!goal) {
            showToast("Savings goal not found. Please refresh the page.", "error");
            return;
        }

        // DELETE A GOAL
        if (isDelete) {
            if (!window.confirm(`Delete the goal "${goal.name}"?`)) {
                return;
            }

            const previousGoals = [...appData.goals];
            appData.goals = appData.goals.filter(
                item => String(item.id) !== String(goalId)
            );

            if (!saveData()) {
                appData.goals = previousGoals;
                return;
            }

            renderApp();
            showToast("Savings goal deleted.");
            return;
        }

        // ADD A CONTRIBUTION
        const currentSaved = Math.max(0, Number(goal.saved) || 0);
        const target = Number(goal.target) || 0;
        const remaining = Math.max(0, target - currentSaved);

        if (remaining <= 0) {
            showToast("This goal has already been achieved.");
            return;
        }

        const input = window.prompt(
            `Goal: ${goal.name}\n` +
            `Already saved: ${money(currentSaved)}\n` +
            `Still needed: ${money(remaining)}\n\n` +
            "Enter your contribution amount (₹):"
        );

        if (input === null) return;

        const cleanedInput = input.trim();

        if (!cleanedInput) {
            showToast("Please enter a contribution amount.", "error");
            return;
        }

        const amount = Number(cleanedInput);

        if (!Number.isFinite(amount) || amount <= 0 ||
            amount > 1000000000000) {
            showToast("Enter a valid amount greater than zero.", "error");
            return;
        }

        // Do not allow contributions to exceed the target.
        const newSaved = Math.min(target, currentSaved + amount);
        const goalWasCompleted = currentSaved >= target;
        const goalIsNowCompleted = newSaved >= target;

        // Keep the old values in case storage saving fails.
        const oldSaved = goal.saved;
        const oldPoints = Number(appData.points) || 0;
        const oldBadges = [...appData.badges];
        const oldDates = [...appData.activityDates];
        const oldBestStreak = appData.bestStreak;

        // Update the existing goal in the main app data.
        goal.saved = newSaved;

        if (goalIsNowCompleted && !goalWasCompleted) {
            if (!appData.badges.includes("goal-complete")) {
                appData.badges.push("goal-complete");
            }

            addPoints(25);
        } else {
            addPoints(5);
        }

        markActivity();

        // Save all updated information together.
        if (!saveData()) {
            goal.saved = oldSaved;
            appData.points = oldPoints;
            appData.badges = oldBadges;
            appData.activityDates = oldDates;
            appData.bestStreak = oldBestStreak;

            renderGoals();
            return;
        }

        // Refresh the interface from the updated app data.
        renderApp();

        if (goalIsNowCompleted && !goalWasCompleted) {
            showToast("Goal achieved! You earned 25 XP and unlocked a badge.");
        } else {
            showToast(
                `Contribution added! ${money(amount)} added to "${goal.name}".`
            );
        }

        playSound("success");
    });
}

function renderGoals() {
    const container = $("#goalsList");
    if (!container) return;

    const hasGoals = appData.goals.length > 0;

    const createCard = $(".goal-create-card");
    const createCardSection = createCard?.closest(".feature-grid");

    if (createCardSection) {
        createCardSection.hidden = hasGoals;
    } else if (createCard) {
        createCard.hidden = hasGoals;
    }

    if (!hasGoals) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = appData.goals.map(goal => {
        const target = Math.max(0, Number(goal.target) || 0);
        const saved = Math.max(0, Number(goal.saved) || 0);

        const percentage = target > 0
            ? Math.min(100, saved / target * 100)
            : 0;

        const complete = target > 0 && saved >= target;

        return `
            <article class="panel goal-card">
                <div class="goal-card-top">
                    <span class="feature-icon">◎</span>
                    <button type="button"
                        class="text-button"
                        data-delete-goal="${escapeHTML(goal.id)}">
                        Delete
                    </button>
                </div>

                <h3>${escapeHTML(goal.name)}</h3>

                <p class="goal-amounts">
                    <strong>${money(saved)}</strong>
                    <span>of ${money(target)}</span>
                </p>

                <div class="level-progress">
                    <div class="level-progress-fill"
                        style="width:${percentage}%"></div>
                </div>

                <p>${Math.round(percentage)}% complete</p>

                <p class="muted-text">
                    ${money(Math.max(0, target - saved))} remaining
                </p>

                ${goal.date
                    ? `<p class="muted-text">Target date: ${formatDate(goal.date)}</p>`
                    : ""}

                ${complete
                    ? '<p class="goal-complete">✦ Goal achieved!</p>'
                    : `
                        <button type="button"
                            class="secondary-button full-width"
                            data-contribute-goal="${escapeHTML(goal.id)}">
                            Add contribution
                        </button>
                    `}
            </article>
        `;
    }).join("");
}

// ---------------------------------------------------------
// 10. MONEY STORY
// ---------------------------------------------------------

function renderMoneyStory() {
    const period = $("#storyPeriod")?.value || "month";
    const transactions = getTransactionsForPeriod(period);
    const totals = calculateTotals(transactions);

    setText("storyIncome", money(totals.income));
    setText("storyExpenses", money(totals.expenses));
    setText("storySavings", money(totals.savings));

    if (!transactions.length) {
        setText("storyHeadline", "Every journey starts somewhere.");
        setText("storyNarrative",
            "Record transactions to build your first Money Story.");
        return;
    }

    const expenses = transactions.filter(item => item.type === "expense");
    const categoryTotals = {};

    expenses.forEach(item => {
        categoryTotals[item.category] =
            (categoryTotals[item.category] || 0) + Number(item.amount);
    });

    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

    const periodLabel = {
        week: "this week",
        month: "this month",
        year: "this year",
        all: "overall"
    }[period] || "this period";

    setText("storyHeadline", totals.savings >= 0
        ? "A little more clarity, a little more control."
        : "A moment to pause and reset.");

    let narrative =
        `You recorded ${money(totals.income)} in income and ` +
        `${money(totals.expenses)} in expenses ${periodLabel}. `;

    narrative += totals.savings >= 0
        ? `Your net result was ${money(totals.savings)}. `
        : `Your expenses exceeded income by ${money(Math.abs(totals.savings))}. `;

    if (topCategory) {
        narrative += `Your largest expense category was ${topCategory[0]}, at ${money(topCategory[1])}. `;
    }

    narrative += "Use this reflection to make choices that fit your priorities.";
    setText("storyNarrative", narrative);
}

// ---------------------------------------------------------
// 11. MONEY QUESTS, LEVELS AND BADGES
// ---------------------------------------------------------

const questDefinitions = [
    {
        id: "first-transaction",
        title: "Your first money note",
        description: "Record your first transaction.",
        reward: 20,
        check: () => appData.transactions.length >= 1
    },
    {
        id: "five-transactions",
        title: "Build the picture",
        description: "Record five transactions.",
        reward: 30,
        check: () => appData.transactions.length >= 5
    },
    {
        id: "create-goal",
        title: "Dream with a plan",
        description: "Create a savings goal.",
        reward: 25,
        check: () => appData.goals.length >= 1
    },
    {
        id: "set-budget",
        title: "Spend with intention",
        description: "Set a monthly budget.",
        reward: 20,
        check: () => Number(appData.monthlyBudget) > 0
    },
    {
        id: "seven-day-streak",
        title: "Consistency looks good on you",
        description: "Track your money on seven consecutive days.",
        reward: 50,
        check: () => getCurrentStreak() >= 7
    }
];

const badgeDefinitions = [
    {
        id: "first-transaction",
        name: "First Step",
        description: "Recorded your first transaction.",
        check: () => appData.transactions.length >= 1
    },
    {
        id: "five-transactions",
        name: "Money in Motion",
        description: "Recorded five transactions.",
        check: () => appData.transactions.length >= 5
    },
    {
        id: "first-goal",
        name: "Dream Builder",
        description: "Created a savings goal.",
        check: () => appData.goals.length >= 1
    },
    {
        id: "goal-complete",
        name: "Goal Achiever",
        description: "Reached a savings goal.",
        check: () => appData.badges.includes("goal-complete")
    },
    {
        id: "week-streak",
        name: "Seven Days of Intention",
        description: "Built a seven-day tracking streak.",
        check: () => getCurrentStreak() >= 7
    }
];

function checkQuestRewards() {
    let changed = false;

    questDefinitions.forEach(quest => {
        const key = `quest:${quest.id}`;

        if (quest.check() && !appData.badges.includes(key)) {
            appData.badges.push(key);
            addPoints(quest.reward);
            changed = true;
            showToast(`Quest completed: ${quest.title}! +${quest.reward} XP`);
        }
    });

    badgeDefinitions.forEach(badge => {
        if (badge.check() && !appData.badges.includes(badge.id)) {
            appData.badges.push(badge.id);
            changed = true;
            showToast(`Badge unlocked: ${badge.name}!`);
        }
    });

    if (changed) saveData();
}

function renderQuests() {
    checkQuestRewards();

    const points = Number(appData.points) || 0;
    const level = Math.floor(points / 100) + 1;

    const levelNames = [
        "Beginner", "Explorer", "Planner", "Builder",
        "Achiever", "Wealth Weaver", "Vault Master"
    ];

    const name = levelNames[Math.min(level - 1, levelNames.length - 1)];
    const streak = getCurrentStreak();

    setText("questLevelTitle", `Level ${level} · ${name}`);
    setText("questLevelDescription",
        "Every thoughtful action moves you forward.");
    setText("questTotalPoints", `${points} XP`);
    setText("questCurrentStreak", `${streak} days`);
    setText("questBestStreak", `${appData.bestStreak || 0} days`);

    const earnedBadges = badgeDefinitions.filter(
        badge => appData.badges.includes(badge.id)
    );

    setText("questBadgesCount", earnedBadges.length);

    setText("personalBestMessage",
        streak >= (appData.bestStreak || 0) && streak > 0
            ? "You're matching or improving on your personal best. Keep going at your own pace."
            : `Your best recorded streak is ${appData.bestStreak || 0} days. Your next personal record is yours to build.`);

    const questContainer = $("#questsList");

    if (questContainer) {
        questContainer.innerHTML = questDefinitions.map(quest => {
            const complete = appData.badges.includes(`quest:${quest.id}`);

            return `
                <article class="panel quest-card">
                    <span class="feature-icon">${complete ? "✦" : "◇"}</span>
                    <h3>${escapeHTML(quest.title)}</h3>
                    <p>${escapeHTML(quest.description)}</p>
                    <p class="quest-reward">Reward: ${quest.reward} XP</p>
                    <span>${complete ? "Completed ✓" : "In progress"}</span>
                </article>
            `;
        }).join("");
    }

    const badgeContainer = $("#badgesList");

    if (badgeContainer) {
        badgeContainer.innerHTML = badgeDefinitions.map(badge => {
            const earned = appData.badges.includes(badge.id);

            return `
                <article class="panel badge-card ${earned ? "earned" : "locked"}">
                    <span class="badge-symbol">${earned ? "✦" : "◇"}</span>
                    <h4>${escapeHTML(badge.name)}</h4>
                    <p>${escapeHTML(badge.description)}</p>
                    <small>${earned ? "Unlocked" : "Not unlocked yet"}</small>
                </article>
            `;
        }).join("");
    }
}

// ---------------------------------------------------------
// 12. DATE LABEL
// ---------------------------------------------------------

function renderDate() {
    const date = new Date();

    setText("currentDate", date.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).toUpperCase());
}

// ---------------------------------------------------------
// 13. REFRESH EVERYTHING
// ---------------------------------------------------------

function renderApp() {
    renderDate();
    renderDashboard();
    renderAllTransactions();
    renderInsights();
    renderGoals();
    renderMoneyStory();
    renderQuests();
    updateSoundButton();
}

// ---------------------------------------------------------
// 14. START VAULTLY
// ---------------------------------------------------------

function initVaultly() {
    setupNavigation();
    setupTransactionForm();
    setupTransactionFilters();
    setupInsights();
    setupGoals();

    $("#storyPeriod")?.addEventListener("change", renderMoneyStory);

    updateBestStreak();
    checkQuestRewards();
    renderApp();
}

document.addEventListener("DOMContentLoaded", initVaultly);

/* =========================================================
   VAULTLY — FIXED SAVINGS GOAL CONTRIBUTIONS
   Uses a custom popup instead of prompt()
   ========================================================= */

(function setupVaultlyContributionFix() {
    "use strict";

    // Prevent this fix from being installed more than once.
    if (document.documentElement.dataset.vaultlyContributionFix) {
        return;
    }

    document.documentElement.dataset.vaultlyContributionFix = "true";

    const style = document.createElement("style");

    style.textContent = `
        .vaultly-contribution-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(30, 20, 35, 0.55);
            backdrop-filter: blur(7px);
        }

        .vaultly-contribution-modal {
            width: 100%;
            max-width: 390px;
            padding: 28px;
            border-radius: 22px;
            background: #fffaf7;
            color: #35213b;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
            font-family: inherit;
        }

        .vaultly-contribution-modal h2 {
            margin: 0 0 8px;
            font-size: 23px;
        }

        .vaultly-contribution-modal p {
            margin: 0 0 20px;
            color: #786b7b;
            overflow-wrap: anywhere;
        }

        .vaultly-contribution-modal label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .vaultly-contribution-modal input {
            box-sizing: border-box;
            width: 100%;
            padding: 13px;
            border: 1px solid #d9c6d9;
            border-radius: 11px;
            background: white;
            color: #35213b;
            font: inherit;
            font-size: 16px;
        }

        .vaultly-contribution-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .vaultly-contribution-actions button {
            flex: 1;
            padding: 12px;
            border: 0;
            border-radius: 11px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }

        .vaultly-contribution-cancel {
            background: #eee5ef;
            color: #49364e;
        }

        .vaultly-contribution-save {
            background: #633c70;
            color: white;
        }

        .vaultly-contribution-error {
            min-height: 20px;
            margin-top: 8px;
            color: #b42345;
            font-size: 13px;
        }
    `;

    document.head.appendChild(style);

    function closeContributionPopup() {
        document.querySelector(
            ".vaultly-contribution-overlay"
        )?.remove();
    }

    function openContributionPopup(goalId) {
        closeContributionPopup();

        const goal = appData.goals.find(
            item => String(item.id) === String(goalId)
        );

        if (!goal) {
            alert("This savings goal could not be found. Please refresh Vaultly.");
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "vaultly-contribution-overlay";

        const modal = document.createElement("form");
        modal.className = "vaultly-contribution-modal";

        const heading = document.createElement("h2");
        heading.textContent = "Add contribution";

        const description = document.createElement("p");
        description.textContent = `Add money to "${goal.name}".`;

        const label = document.createElement("label");
        label.htmlFor = "vaultly-contribution-amount";
        label.textContent = "Contribution amount (₹)";

        const input = document.createElement("input");
        input.id = "vaultly-contribution-amount";
        input.type = "number";
        input.min = "0.01";
        input.step = "0.01";
        input.placeholder = "Enter amount";
        input.required = true;
        input.autocomplete = "off";

        const error = document.createElement("div");
        error.className = "vaultly-contribution-error";
        error.setAttribute("role", "alert");

        const actions = document.createElement("div");
        actions.className = "vaultly-contribution-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "vaultly-contribution-cancel";
        cancelButton.textContent = "Cancel";

        const saveButton = document.createElement("button");
        saveButton.type = "submit";
        saveButton.className = "vaultly-contribution-save";
        saveButton.textContent = "Add money";

        actions.append(cancelButton, saveButton);
        modal.append(heading, description, label, input, error, actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        cancelButton.addEventListener("click", closeContributionPopup);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeContributionPopup();
            }
        });

        modal.addEventListener("submit", event => {
            event.preventDefault();

            const amount = Number(input.value);

            if (!Number.isFinite(amount) || amount <= 0) {
                error.textContent = "Please enter an amount greater than zero.";
                input.focus();
                return;
            }

            // Make sure the latest goal is still present.
            const currentGoal = appData.goals.find(
                item => String(item.id) === String(goalId)
            );

            if (!currentGoal) {
                error.textContent = "Goal not found. Please refresh and try again.";
                return;
            }

            const previousSaved = Number(currentGoal.saved) || 0;
            const newSaved = previousSaved + amount;

            if (!Number.isFinite(newSaved)) {
                error.textContent = "Please enter a smaller amount.";
                return;
            }

            currentGoal.saved = newSaved;

            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(appData)
                );
            } catch (storageError) {
                // Restore the previous value if saving fails.
                currentGoal.saved = previousSaved;

                error.textContent =
                    "Vaultly couldn't save this contribution. Please try again.";
                console.error("Vaultly contribution save failed:", storageError);
                return;
            }

            closeContributionPopup();

            // Refresh the existing app and its savings-goal display.
            if (typeof renderApp === "function") {
                renderApp();
            } else {
                window.location.reload();
            }
        });

        input.focus();
    }

    /*
     * Capture the click before the older handler runs.
     * This prevents the unsupported prompt() call from executing.
     */
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-contribute-goal]");

        if (!button) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        openContributionPopup(button.dataset.contributeGoal);
    }, true);

})();
