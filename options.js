// Default settings
const defaultSettings = {
    enableWhitney: true,
    enableAIC: true,
    enableCleveland: true,
    enableMet: true,
    enableWikimedia: false
};

// Load saved settings
chrome.storage.local.get(defaultSettings, (result) => {
    document.getElementById('enableWhitney').checked = result.enableWhitney;
    document.getElementById('enableAIC').checked = result.enableAIC;
    document.getElementById('enableCleveland').checked = result.enableCleveland;
    document.getElementById('enableMet').checked = result.enableMet;
    document.getElementById('enableWikimedia').checked = result.enableWikimedia;
});

// Get all checkboxes
const checkboxes = [
    document.getElementById('enableWhitney'),
    document.getElementById('enableAIC'),
    document.getElementById('enableCleveland'),
    document.getElementById('enableMet'),
    document.getElementById('enableWikimedia')
];

// Save settings when any checkbox changes
checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Check if at least one is enabled
        const anyEnabled = checkboxes.some(cb => cb.checked);
        
        if (!anyEnabled) {
            // Prevent disabling all sources
            checkbox.checked = true;
            showWarning();
            return;
        }

        // Save settings
        const settings = {
            enableWhitney: document.getElementById('enableWhitney').checked,
            enableAIC: document.getElementById('enableAIC').checked,
            enableCleveland: document.getElementById('enableCleveland').checked,
            enableMet: document.getElementById('enableMet').checked,
            enableWikimedia: document.getElementById('enableWikimedia').checked
        };

        chrome.storage.local.set(settings, () => {
            showStatus();
        });
    });
});

function showStatus() {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 2000);
}

function showWarning() {
    const warning = document.getElementById('warning');
    warning.style.display = 'block';
    setTimeout(() => {
        warning.style.display = 'none';
    }, 3000);
}