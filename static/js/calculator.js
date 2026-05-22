document.addEventListener('DOMContentLoaded', () => {
    // Current state variables
    let inputExpr = '';       // Raw expression sent to server (e.g. '12*(3+4)')
    let needsReset = false;   // Clear display on next numeric input after a calculation
    let previewDebounceTimer = null;

    // DOM Elements
    const displayInput = document.getElementById('display-input');
    const displayExpression = document.getElementById('display-expression');
    const displayPreview = document.getElementById('display-preview');
    const equalsIndicator = document.getElementById('equals-indicator');
    
    const themeToggle = document.getElementById('theme-toggle');
    const historyToggle = document.getElementById('history-toggle');
    const scientificToggle = document.getElementById('scientific-toggle');
    const scientificPanel = document.getElementById('scientific-panel');
    const historyPanel = document.getElementById('history-panel');
    const historyCloseBtn = document.getElementById('history-close-btn');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const toastContainer = document.getElementById('toast-container');
    
    // Core Keypad Buttons
    const buttons = document.querySelectorAll('.btn');

    // 1. Theme Configuration
    let savedTheme = 'dark-theme';
    try {
        savedTheme = localStorage.getItem('theme') || 'dark-theme';
    } catch (e) {
        console.warn('LocalStorage is blocked or inaccessible:', e);
    }
    document.body.className = savedTheme;
    
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.className = 'light-theme';
            try {
                localStorage.setItem('theme', 'light-theme');
            } catch (e) {
                console.warn('Failed to save theme in localStorage:', e);
            }
            showToast('Switched to Light Theme', 'success');
        } else {
            document.body.className = 'dark-theme';
            try {
                localStorage.setItem('theme', 'dark-theme');
            } catch (e) {
                console.warn('Failed to save theme in localStorage:', e);
            }
            showToast('Switched to Dark Theme', 'success');
        }
    });

    // 2. Scientific Panel Toggle
    scientificToggle.addEventListener('click', () => {
        scientificToggle.classList.toggle('active');
        scientificPanel.classList.toggle('show');
    });

    // 3. History Sidebar Drawer Panel
    historyToggle.addEventListener('click', () => {
        historyPanel.classList.add('open');
        loadHistory();
    });

    historyCloseBtn.addEventListener('click', () => {
        historyPanel.classList.remove('open');
    });

    // Close history drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (!historyPanel.contains(e.target) && 
            !historyToggle.contains(e.target) && 
            historyPanel.classList.contains('open')) {
            historyPanel.classList.remove('open');
        }
    });

    // 4. Input Formatting
    function formatDisplayExpression(expr) {
        if (!expr) return '';
        // Map operators to user-friendly mathematical symbols
        return expr
            .replace(/\*\*/g, ' ^ ')
            .replace(/\*/g, ' &times; ')
            .replace(/\//g, ' &divide; ')
            .replace(/\+/g, ' + ')
            .replace(/\-/g, ' &minus; ')
            .replace(/%/g, ' % ')
            .replace(/sqrt\(/g, ' &radic;(')
            .replace(/sin\(/g, 'sin(')
            .replace(/cos\(/g, 'cos(')
            .replace(/tan\(/g, 'tan(')
            .replace(/log\(/g, 'log(')
            .replace(/ln\(/g, 'ln(')
            .replace(/abs\(/g, 'abs(');
    }

    function formatNumberWithCommas(str) {
        if (!str || isNaN(str)) return str;
        const parts = str.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function adjustFontSize(text) {
        const length = text.toString().length;
        
        // Remove existing size classes to ensure style overrides don't conflict
        displayInput.classList.remove('size-default', 'size-medium', 'size-small', 'size-xs', 'size-xxs');
        
        // Apply appropriate size class based on character count
        if (length > 48) {
            displayInput.classList.add('size-xxs');
        } else if (length > 32) {
            displayInput.classList.add('size-xs');
        } else if (length > 20) {
            displayInput.classList.add('size-small');
        } else if (length > 12) {
            displayInput.classList.add('size-medium');
        } else {
            displayInput.classList.add('size-default');
        }
    }

    function updateDisplay() {
        if (inputExpr === '') {
            displayInput.innerHTML = '0';
            adjustFontSize('0');
        } else {
            displayInput.innerHTML = formatDisplayExpression(inputExpr);
            adjustFontSize(inputExpr);
        }
        
        // Hide equals sign during live typing
        equalsIndicator.style.display = 'none';
        
        // Handle live preview evaluation
        triggerLivePreview();
        
        // Scroll to the bottom of display container to keep the current inputs visible
        setTimeout(() => {
            displayInput.scrollTop = displayInput.scrollHeight;
        }, 0);
    }

    // 5. Toast Notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = document.createElement('i');
        if (type === 'error') {
            icon.className = 'fa-solid fa-circle-exclamation';
        } else if (type === 'success') {
            icon.className = 'fa-solid fa-circle-check';
        } else {
            icon.className = 'fa-solid fa-circle-info';
        }
        
        const text = document.createElement('span');
        text.innerText = message;
        
        toast.appendChild(icon);
        toast.appendChild(text);
        toastContainer.appendChild(toast);
        
        // Auto-remove toast after 4s
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // 6. Action Handlers
    function handleNumber(num) {
        if (needsReset) {
            inputExpr = '';
            needsReset = false;
        }
        
        // Avoid starting with multiple decimal points
        if (num === '.' && inputExpr.endsWith('.')) return;
        
        // If current display is '0' and we type a non-decimal digit, replace it
        if (inputExpr === '0' && num !== '.') {
            inputExpr = num;
        } else {
            inputExpr += num;
        }
        updateDisplay();
    }

    function handleOperator(op) {
        needsReset = false;
        
        // If expression is empty and operator is not sign, prefix with 0
        if (inputExpr === '' && (op === '*' || op === '/' || op === '%' || op === '**')) {
            inputExpr = '0' + op;
            updateDisplay();
            return;
        }

        // Avoid adding duplicate consecutive binary operators
        const lastChar = inputExpr.slice(-1);
        const lastTwo = inputExpr.slice(-2);
        
        if (['+', '-', '*', '/', '%'].includes(lastChar)) {
            // If it's a power '**', handle it
            if (lastTwo === '**' && op !== '*') {
                inputExpr = inputExpr.slice(0, -2) + op;
            } else if (lastChar === '*' && op === '*') {
                // Change multiplication to exponentiation
                inputExpr += '*';
            } else {
                // Replace previous operator
                inputExpr = inputExpr.slice(0, -1) + op;
            }
        } else {
            inputExpr += op;
        }
        updateDisplay();
    }

    function handleFunction(funcName) {
        if (needsReset) {
            inputExpr = '';
            needsReset = false;
        }
        
        if (inputExpr === '0' || inputExpr === '') {
            inputExpr = funcName + '(';
        } else {
            // Check if last character is a digit or parenthesis to add explicit multiplication
            const lastChar = inputExpr.slice(-1);
            if (/\d|\)/.test(lastChar)) {
                inputExpr += '*' + funcName + '(';
            } else {
                inputExpr += funcName + '(';
            }
        }
        updateDisplay();
    }

    function handleClear() {
        inputExpr = '';
        displayExpression.innerHTML = '';
        displayPreview.innerHTML = '';
        equalsIndicator.style.display = 'none';
        needsReset = false;
        updateDisplay();
    }

    function handleBackspace() {
        if (needsReset) {
            handleClear();
            return;
        }
        
        if (inputExpr === '') return;
        
        // Custom UX: Check if the expression ends with a scientific function word
        const functions = ['sqrt\\(', 'sin\\(', 'cos\\(', 'tan\\(', 'log\\(', 'ln\\(', 'abs\\('];
        let matched = false;
        
        for (const func of functions) {
            const regex = new RegExp(func + '$');
            if (regex.test(inputExpr)) {
                inputExpr = inputExpr.replace(regex, '');
                matched = true;
                break;
            }
        }
        
        if (!matched) {
            inputExpr = inputExpr.slice(0, -1);
        }
        
        updateDisplay();
    }

    // 7. Dynamic API Requests
    function triggerLivePreview() {
        // Clear any pending debounces
        if (previewDebounceTimer) {
            clearTimeout(previewDebounceTimer);
        }
        
        // Clear preview screen if expression is too short or empty
        if (!inputExpr || inputExpr.length < 2) {
            displayPreview.innerHTML = '';
            return;
        }
        
        // Debounce live evaluations by 300ms to reduce backend load
        previewDebounceTimer = setTimeout(() => {
            // Count open vs closed parentheses to balance the expression dynamically for live preview
            let balancedExpr = inputExpr;
            const openParens = (balancedExpr.match(/\(/g) || []).length;
            const closeParens = (balancedExpr.match(/\)/g) || []).length;
            
            if (openParens > closeParens) {
                balancedExpr += ')'.repeat(openParens - closeParens);
            }
            
            fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expression: balancedExpr, preview: true })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    displayPreview.innerHTML = formatNumberWithCommas(data.result);
                } else {
                    displayPreview.innerHTML = '';
                }
            })
            .catch(() => {
                displayPreview.innerHTML = '';
            });
        }, 300);
    }

    function evaluateExpression() {
        if (!inputExpr) return;
        
        // Auto-close open parentheses before evaluation
        const openParens = (inputExpr.match(/\(/g) || []).length;
        const closeParens = (inputExpr.match(/\)/g) || []).length;
        if (openParens > closeParens) {
            inputExpr += ')'.repeat(openParens - closeParens);
        }
        
        displayPreview.innerHTML = '';
        
        fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expression: inputExpr })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Set the evaluation state
                displayExpression.innerHTML = formatDisplayExpression(inputExpr);
                equalsIndicator.style.display = 'block';
                
                inputExpr = data.result.toString();
                displayInput.innerHTML = formatNumberWithCommas(data.result);
                adjustFontSize(inputExpr);
                needsReset = true;
                
                // Refresh background history if drawer is open
                if (historyPanel.classList.contains('open')) {
                    loadHistory();
                }

                // Scroll to the bottom of display container
                setTimeout(() => {
                    displayInput.scrollTop = displayInput.scrollHeight;
                }, 0);
            } else {
                showToast(data.error || 'Calculation error', 'error');
            }
        })
        .catch(err => {
            showToast('Unable to connect to calculation server', 'error');
        });
    }

    // 8. History Management
    function loadHistory() {
        fetch('/api/history')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderHistory(data.history);
            }
        })
        .catch(() => {
            showToast('Failed to load history', 'error');
        });
    }

    function renderHistory(historyItems) {
        if (!historyItems || historyItems.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-folder-open"></i>
                    <p>No history yet. Start calculating!</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = historyItems.map(item => `
            <div class="history-card" data-expr="${item.expression}" data-res="${item.result}">
                <div class="hist-expr">${formatDisplayExpression(item.expression)}</div>
                <div class="hist-res">${formatNumberWithCommas(item.result)}</div>
            </div>
        `).join('');
        
        // Add click events to history items to recall calculations
        document.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => {
                inputExpr = card.getAttribute('data-expr');
                needsReset = false;
                updateDisplay();
                historyPanel.classList.remove('open');
                showToast('Calculation restored', 'success');
            });
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        fetch('/api/history', { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('History cleared', 'success');
                renderHistory([]);
            }
        })
        .catch(() => {
            showToast('Failed to clear database history', 'error');
        });
    });

    // 9. Click Handler for Keypad Buttons
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const val = btn.getAttribute('data-val');
            
            if (action === 'num') handleNumber(val);
            else if (action === 'operator') handleOperator(val);
            else if (action === 'func') handleFunction(val);
            else if (action === 'clear') handleClear();
            else if (action === 'backspace') handleBackspace();
            else if (action === 'equals') evaluateExpression();
        });
    });

    // 10. Physical Keyboard Mapping & Visual Feedback
    const keyboardMapping = {
        '0': { selector: '[data-action="num"][data-val="0"]', action: () => handleNumber('0') },
        '1': { selector: '[data-action="num"][data-val="1"]', action: () => handleNumber('1') },
        '2': { selector: '[data-action="num"][data-val="2"]', action: () => handleNumber('2') },
        '3': { selector: '[data-action="num"][data-val="3"]', action: () => handleNumber('3') },
        '4': { selector: '[data-action="num"][data-val="4"]', action: () => handleNumber('4') },
        '5': { selector: '[data-action="num"][data-val="5"]', action: () => handleNumber('5') },
        '6': { selector: '[data-action="num"][data-val="6"]', action: () => handleNumber('6') },
        '7': { selector: '[data-action="num"][data-val="7"]', action: () => handleNumber('7') },
        '8': { selector: '[data-action="num"][data-val="8"]', action: () => handleNumber('8') },
        '9': { selector: '[data-action="num"][data-val="9"]', action: () => handleNumber('9') },
        '.': { selector: '[data-action="num"][data-val="."]', action: () => handleNumber('.') },
        '+': { selector: '[data-action="operator"][data-val="+"]', action: () => handleOperator('+') },
        '-': { selector: '[data-action="operator"][data-val="-"]', action: () => handleOperator('-') },
        '*': { selector: '[data-action="operator"][data-val="*"]', action: () => handleOperator('*') },
        '/': { selector: '[data-action="operator"][data-val="/"]', action: () => handleOperator('/') },
        '%': { selector: '[data-action="operator"][data-val="%"]', action: () => handleOperator('%') },
        '^': { selector: '[data-action="operator"][data-val="**"]', action: () => handleOperator('**') },
        '(': { selector: null, action: () => handleNumber('(') },
        ')': { selector: null, action: () => handleNumber(')') },
        'Enter': { selector: '#btn-equals', action: () => evaluateExpression() },
        '=': { selector: '#btn-equals', action: () => evaluateExpression() },
        'Backspace': { selector: '#btn-backspace', action: () => handleBackspace() },
        'Escape': { selector: '#btn-clear', action: () => handleClear() },
        'c': { selector: '#btn-clear', action: () => handleClear() },
        'C': { selector: '#btn-clear', action: () => handleClear() }
    };

    window.addEventListener('keydown', (e) => {
        const mapping = keyboardMapping[e.key];
        if (mapping) {
            e.preventDefault(); // Prevent standard browser scrollings on Space/Arrow keys
            
            // Execute action
            mapping.action();
            
            // Add visual active states (glow key press)
            if (mapping.selector) {
                const btnEl = document.querySelector(mapping.selector);
                if (btnEl) {
                    btnEl.classList.add('key-pressed');
                    setTimeout(() => {
                        btnEl.classList.remove('key-pressed');
                    }, 120);
                }
            }
        }
    });

    // Initialize display values
    updateDisplay();
});
