// ==================================
// 1. Select HTML elements
// ==================================

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const menuToggle = document.getElementById("menuToggle");

const dashboardView = document.getElementById("dashboardView");
const modulePlaceholder = document.getElementById("modulePlaceholder");

const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const pageEyebrow = document.getElementById("pageEyebrow");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");

const globalSearch = document.getElementById("globalSearch");
const exportButton = document.getElementById("exportButton");
const backToDashboard = document.getElementById("backToDashboard");

const navLinks = document.querySelectorAll(".nav-link");
const pageButtons = document.querySelectorAll("[data-page]");

// ==================================
// 2. Module descriptions
// ==================================

const modules = {
    Employees: {
        icon: "♙",
        description:
            "Manage employee profiles, employee IDs, contact details and workforce records."
    },

    Attendance: {
        icon: "▣",
        description:
            "Record daily attendance, view employee availability and monitor attendance history."
    },

    Inventory: {
        icon: "▤",
        description:
            "Manage raw materials, stock quantities, stock movements and low-stock alerts."
    },

    Production: {
        icon: "⚙",
        description:
            "Monitor production jobs, manufacturing progress and completed production output."
    },

    Dispatch: {
        icon: "⇢",
        description:
            "Manage finished goods dispatch, delivery details and dispatch status."
    },

    Reports: {
        icon: "▥",
        description:
            "View operational summaries and prepare reports for employees, stock and production."
    }
};

// Current page
let currentPage = "Dashboard";

// ==================================
// 3. Page navigation
// ==================================

function openPage(pageName) {
    const isDashboard = pageName === "Dashboard";

    if (!isDashboard && !modules[pageName]) {
        return;
    }

    currentPage = pageName;

    // Update selected navigation item
    navLinks.forEach(function (link) {
        const isActive = link.dataset.page === pageName;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    // Update the top breadcrumb and page heading
    breadcrumbCurrent.textContent = pageName;

    if (isDashboard) {
        pageTitle.textContent = "Dashboard Overview";

        pageDescription.textContent =
            "Monitor your plant's daily operations at a glance.";

        pageEyebrow.textContent = "OPERATIONS CENTER";

        dashboardView.hidden = false;
        modulePlaceholder.hidden = true;

    } else {
        const selectedModule = modules[pageName];

        pageTitle.textContent = pageName + " Management";

        pageDescription.textContent =
            "Manage your plant's " + pageName.toLowerCase() + " operations.";

        pageEyebrow.textContent = "MANAGEMENT MODULE";

        dashboardView.hidden = true;
        modulePlaceholder.hidden = false;

        document.getElementById("moduleIcon").textContent =
            selectedModule.icon;

        document.getElementById("moduleTitle").textContent =
            pageName;

        document.getElementById("moduleDescription").textContent =
            selectedModule.description;
    }

    closeSidebar();
}

// Handle clicks on navigation and "View inventory"
pageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        openPage(button.dataset.page);
    });
});

// Back to dashboard
backToDashboard.addEventListener("click", function () {
    openPage("Dashboard");
});

// ==================================
// 4. Mobile sidebar
// ==================================

function closeSidebar() {
    sidebar.classList.remove("sidebar-open");
    backdrop.classList.remove("backdrop-open");

    menuToggle.setAttribute("aria-expanded", "false");
}

function toggleSidebar() {
    const isOpen = sidebar.classList.toggle("sidebar-open");

    backdrop.classList.toggle("backdrop-open", isOpen);

    menuToggle.setAttribute("aria-expanded", String(isOpen));
}

menuToggle.addEventListener("click", toggleSidebar);

backdrop.addEventListener("click", closeSidebar);

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeSidebar();
    }
});

// ==================================
// 5. Search inventory and activity
// ==================================

function filterDashboard(query) {
    const rows = document.querySelectorAll(".searchable-row");

    const normalizedQuery = query.toLowerCase().trim();

    rows.forEach(function (row) {
        const searchableText = row.textContent.toLowerCase();

        const matches =
            normalizedQuery === "" ||
            searchableText.includes(normalizedQuery);

        row.style.display = matches ? "" : "none";
    });

    updateEmptyMessage(
        "#inventoryTable .searchable-row",
        "inventoryEmpty",
        normalizedQuery
    );

    updateEmptyMessage(
        "#activityList .searchable-row",
        "activityEmpty",
        normalizedQuery
    );
}

function updateEmptyMessage(selector, messageId, query) {
    const rows = document.querySelectorAll(selector);

    const hasVisibleRows = Array.from(rows).some(function (row) {
        return row.style.display !== "none";
    });

    const message = document.getElementById(messageId);

    message.style.display =
        query !== "" && !hasVisibleRows ? "block" : "none";
}

globalSearch.addEventListener("input", function () {
    // Search applies to dashboard inventory and activities.
    // Open the dashboard if the user is on another module.
    if (currentPage !== "Dashboard") {
        openPage("Dashboard");
    }

    filterDashboard(globalSearch.value);
});

// ==================================
// 6. Export dashboard to CSV
// ==================================

function exportSummary() {
    const summaryRows = [
        ["Manufacturing Management System"],
        ["Dashboard Summary"],
        ["Report Date", new Date().toLocaleDateString("en-IN")],
        [],
        ["Metric", "Value"],
        ["Total Employees", "128"],
        ["Present Today", "112"],
        ["Inventory Items", "246"],
        ["Active Production Jobs", "8"],
        [],
        ["Material", "Stock", "Status"]
    ];

    // Read the visible inventory data from the HTML table.
    const inventoryRows = Array.from(
        document.querySelectorAll("#inventoryTable tr")
    )
        .filter(function (row) {
            return row.style.display !== "none";
        })
        .map(function (row) {
            return Array.from(row.querySelectorAll("td")).map(
                function (cell) {
                    return cell.innerText
                        .replace(/\s+/g, " ")
                        .trim();
                }
            );
        });

    const allRows = summaryRows.concat(inventoryRows);

    // Escape CSV values correctly.
    const csvContent = allRows
        .map(function (row) {
            return row.map(function (value) {
                const safeValue = String(value ?? "")
                    .replace(/"/g, '""');

                return '"' + safeValue + '"';
            }).join(",");
        })
        .join("\r\n");

    // Create the CSV file in the browser.
    const blob = new Blob(
        ["\uFEFF" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = "manufacturing-summary.csv";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(downloadUrl);
}

exportButton.addEventListener("click", exportSummary);

// ==================================
// 7. Display today's date
// ==================================

function displayCurrentDate() {
    const now = new Date();

    document.getElementById("currentDate").textContent =
        now.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    document.getElementById("todayLabel").textContent =
        now.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

// ==================================
// 8. Initial setup
// ==================================

displayCurrentDate();
filterDashboard("");
openPage("Dashboard");